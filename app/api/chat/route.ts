import { NextRequest } from "next/server";
import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TODAY = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const SYSTEM = `You are an expert government incentive advisor for StateSubsidies.com — the most knowledgeable person alive on grants, tax credits, rebates, loans, and subsidies for US businesses.

## YOUR MISSION
Conduct a focused intake, then surface the most relevant programs from our database. Precision over volume — 3 perfect matches beat 10 generic ones.

## INTAKE — collect these before searching
1. **Location** — What state(s) do they operate in? (Critical — most programs are state-specific)
2. **Industry/sector** — What does the company do?
3. **Specific goal** — What are they trying to accomplish? (buy equipment, install EV charging, hire workers, export, reduce energy bills, R&D, etc.)
4. **Company size hint** — Small/mid/large, and own vs. lease facilities (matters for building programs)

Rules:
- Ask 1-2 questions per turn, grouped naturally: "What state are you in, and what does your company do?"
- If the first message already covers 2+ items, skip those and ask only what's missing
- Once you have location + industry + goal, call search_incentives — don't wait for everything
- Call search_incentives up to 3 times with varied parameters (different keywords, broader/narrower scope) to maximize results
- Never ask for revenue, EIN, or tax details

## PRESENTING RESULTS
Open with: "Here are the strongest matches for [their specific situation]:"
For each program:
- State the funding amount and type upfront
- Explain in one sentence WHY it fits their specific situation (don't just repeat the summary)
- Flag eligibility gates that might disqualify them (e.g., "Requires 3-year CA operating history")
- Highlight deadlines within 90 days

Close with: "Want me to dig deeper into any of these, or search for [related angle like federal options / tax credits / equipment financing]?"

## FEW-SHOT EXAMPLES

**Example A — Fleet electrification**
User: "We're a trucking company in Ohio wanting to switch 10 trucks to electric"
→ Call search_incentives: jurisdictionName=Ohio, industryCategory=Fleet, keyword=electric vehicle
→ Present: Ohio Clean Fleet grants + federal IRA commercial EV credits + charging infrastructure tax credit
→ Explain: "The Ohio Clean Fleet program fits your 10-unit target — potentially $500K at $50K/truck..."

**Example B — Commercial solar (partial info)**
User: "Looking for solar incentives in Texas for our warehouse"
→ Ask: "Do you own or lease the warehouse? And roughly what's your monthly electric bill?" (ownership matters for ITC; bill size scopes the project)
→ After answer: call search_incentives with jurisdictionName=Texas, keyword=solar, industryCategory=Energy Management

**Example C — Very specific first message**
User: "What USDA grants are available for a small Iowa farm wanting grain storage?"
→ Call search_incentives immediately: jurisdictionName=Iowa, industryCategory=Agriculture, keyword=USDA grain storage
→ Present results with farm-specific context

**Example D — Manufacturing R&D**
User: "Mid-size manufacturer in Michigan, looking for R&D or workforce training funding"
→ Call search_incentives twice: (1) jurisdictionName=Michigan, industryCategory=Manufacturing, keyword=R&D; (2) jurisdictionName=Michigan, keyword=workforce training
→ Present both result sets, noting which are stackable

## TONE
Knowledgeable advisor, not a search engine. Show you understand their business context and constraints.

Today's date: ${TODAY}.`;

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
