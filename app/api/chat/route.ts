import { NextRequest } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";

export const dynamic = "force-dynamic";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a world-class incentive-matching advisor for StateSubsidies.com. Your job is to ask the right questions to deeply understand a business's situation, then find the most relevant government grants, tax credits, loans, subsidies, and rebates for them.

TODAY'S DATE: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

━━━ INTAKE PROCESS ━━━
Before searching, collect ALL of these through natural conversation:
1. State (or federal if multi-state)
2. Industry / what the business does
3. Specific goal or project (e.g. "buy 5 electric delivery vans", "install rooftop solar", "hire 10 workers", "expand our facility")
4. Business size — employees and/or revenue bracket (this affects eligibility for most programs)
5. Business age / stage (startup <2 yrs, established, etc.) — many grants exclude very new businesses or require them

Ask one or two questions at a time — don't fire all 5 at once. Lead with the most important gaps.
If the user's opening message already answers several of these, acknowledge what you know and only ask what's missing.
Do NOT search until you have at least: state + industry + specific goal. Size is strongly preferred.

━━━ EXAMPLE CONVERSATIONS ━━━

Example A — vague opener, good intake:
User: "I have a small business and want to find grants"
Assistant: "Happy to help! A few quick questions to find the best matches:
1. What state is your business in?
2. What industry are you in, and what are you looking to fund — new equipment, hiring, expansion, or something else?"
User: "Texas, we do HVAC installation and want to buy electric service vehicles"
Assistant: "Got it — Texas HVAC company looking to electrify your fleet. Last thing: roughly how many employees do you have, and how long have you been operating?"
User: "12 employees, 6 years in business"
[NOW SEARCH: jurisdictionName=Texas, industryCategory=Fleet, keyword=electric vehicle]
Assistant: "Here are the strongest matches for a 12-person Texas HVAC business electrifying its fleet: ..."

Example B — detailed opener, minimal intake needed:
User: "We're a 50-person biotech startup in Massachusetts doing genomics R&D, looking for federal grants"
[NOW SEARCH immediately: jurisdictionLevel=FEDERAL, industryCategory=Research & Development, keyword=biotech]
Assistant: "Great — here are the top federal R&D grants for a biotech company at your stage: ..."

Example C — ambiguous industry, needs clarification:
User: "We're in construction in Ohio"
Assistant: "Nice — construction covers a lot of ground. Are you focused on commercial building, residential, green/sustainable construction, or infrastructure? And what specifically are you looking to fund — equipment, workforce training, energy upgrades?"
User: "Commercial, we want to do energy efficiency upgrades on buildings we work on"
[SEARCH: jurisdictionName=Ohio, industryCategory=Building Electrification, keyword=energy efficiency]

━━━ SEARCH STRATEGY ━━━
- Call search_incentives 2–3 times with varied parameters to maximize results
- First call: most specific (state + industry + keyword)
- Second call: broaden (federal + same industry, or drop keyword)
- Third call: adjacent industry or incentive type if first two returned <3 results
- Always sort results mentally: highest funding + verified programs first

━━━ PRESENTING RESULTS ━━━
Structure your response as:
1. One sentence confirming what you searched for
2. **Top Picks** — 2-3 best matches with: name, funding amount, why it fits this specific business, key requirement to watch
3. **Also worth considering** — 1-2 additional programs briefly
4. A closing prompt: ask if they want more details on any program, or if there's a specific eligibility question

Use **bold** for program names and key numbers. Keep each program summary to 2-3 sentences max.`;


export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const matchedIncentives: ReturnType<typeof parseIncentive>[] = [];

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM,
      messages,
      stopWhen: stepCountIs(4),
      tools: {
        search_incentives: tool({
          description:
            "Search the StateSubsidies database for matching incentive programs. " +
            "Can be called multiple times with different parameters to find more results.",
          inputSchema: z.object({
            jurisdictionName: z
              .string()
              .optional()
              .describe("US state name (e.g. 'California') or 'United States' for federal programs"),
            jurisdictionLevel: z
              .enum(["FEDERAL", "STATE", "CITY", "AGENCY"])
              .optional()
              .describe("Jurisdiction level filter"),
            industryCategory: z
              .string()
              .optional()
              .describe(
                "Industry category — pick the closest match from: Agriculture, Automotive, Aviation, " +
                "Building Electrification, Clean Technology, Construction, Education, Energy Management, " +
                "Energy Storage, EV Charging, Fleet, Food & Beverage, Forestry, Government & Nonprofit, " +
                "Healthcare, Manufacturing, Maritime, Oil & Gas Transition, Public Transit, Real Estate, " +
                "Research & Development, Retail, Technology, Waste Management, Water & Utilities"
              ),
            incentiveType: z
              .enum(["GRANT", "TAX_CREDIT", "LOAN", "VOUCHER", "POINT_OF_SALE_REBATE", "SUBSIDY"])
              .optional()
              .describe("Type of incentive"),
            keyword: z
              .string()
              .optional()
              .describe(
                "Free-text keyword searched in title, summary, and agency name " +
                "(e.g. 'electric vehicle', 'solar', 'workforce training', 'export')"
              ),
          }),
          execute: async (input) => {
            const where: Record<string, unknown> = { status: "ACTIVE" };

            if (input.jurisdictionName) {
              where.jurisdictionName = { contains: input.jurisdictionName, mode: "insensitive" };
            }
            if (input.jurisdictionLevel) where.jurisdictionLevel = input.jurisdictionLevel;
            if (input.incentiveType) where.incentiveType = input.incentiveType;

            const orClauses: Array<Record<string, unknown>> = [];
            if (input.industryCategory) {
              orClauses.push({ industryCategories: { contains: input.industryCategory } });
            }
            if (input.keyword) {
              orClauses.push(
                { title: { contains: input.keyword, mode: "insensitive" } },
                { shortSummary: { contains: input.keyword, mode: "insensitive" } },
                { managingAgency: { contains: input.keyword, mode: "insensitive" } }
              );
            }
            if (orClauses.length) where.OR = orClauses;

            const rows = await prisma.incentive.findMany({
              where,
              take: 8,
              orderBy: [{ isVerified: "desc" }, { fundingAmount: "desc" }, { createdAt: "desc" }],
            });

            const parsed = rows.map((r) => parseIncentive(r as unknown as Record<string, unknown>));
            matchedIncentives.push(...parsed);

            return parsed.map((r) => ({
              title: r.title,
              slug: r.slug,
              type: r.incentiveType,
              jurisdictionLevel: r.jurisdictionLevel,
              jurisdictionName: r.jurisdictionName,
              agency: r.managingAgency,
              amount: r.fundingAmount,
              deadline: r.deadline,
              summary: r.shortSummary,
              requirements: r.keyRequirements.slice(0, 3),
              sourceUrl: r.sourceUrl,
            }));
          },
        }),
      },
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.fullStream) {
            if (chunk.type === "text-delta") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk.text })}\n\n`)
              );
            }
            if (chunk.type === "finish") {
              const seen = new Set<string>();
              const unique = matchedIncentives.filter((i) =>
                seen.has(i.slug) ? false : (seen.add(i.slug), true)
              );
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ done: true, matched: unique })}\n\n`)
              );
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[POST /api/chat]", e);
    const msg = e instanceof Error ? e.message : "Failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
}
