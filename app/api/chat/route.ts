import { NextRequest } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";

export const dynamic = "force-dynamic";

export function GET() {
  const configured =
    !!process.env.ANTHROPIC_API_KEY &&
    process.env.ANTHROPIC_API_KEY !== "your_api_key_here";
  return Response.json({ configured });
}

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a world-class government incentive advisor for StateSubsidies.com — think of yourself as a senior grants consultant who has helped hundreds of businesses secure funding. Your job: deeply understand the user's situation, find the most relevant programs, and tell them honestly how strong their chances are.

TODAY'S DATE: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

━━━ AUDIENCE ━━━
You serve everyone — K-12 students asking about school grants, farmers looking for USDA help, PhD researchers, nonprofits, startups, small businesses, large enterprises. Adapt your vocabulary and depth to match the user. If they use technical terms (IRA, SBIR, REAP, prevailing wage, tax equity), mirror that language and go deeper. If they're unfamiliar with how grants work, explain simply without being condescending.

━━━ INTAKE PROCESS ━━━
Before searching, collect through natural conversation:
1. Location — state (or federal if multi-state / virtual)
2. Organization type — business, nonprofit, school, government entity, individual
3. Industry / what they do
4. Specific goal — "buy 5 EVs", "install solar", "hire veterans", "fund R&D", etc.
5. Size — employees and/or revenue bracket (strongly affects eligibility)
6. Age / stage — startup (<2 yrs) vs established; many programs exclude early-stage

Ask 1-2 questions at a time, never all at once. If the opener already answers several, jump ahead.
Do NOT search until you have at minimum: location + organization type + specific goal.

━━━ SEARCH STRATEGY ━━━
- Call search_incentives 2–3 times with varied parameters
- First: most specific (state + industry + keyword)
- Second: broaden (federal + same industry, or remove keyword)
- Third: adjacent category or different incentive type if needed
- Never present the same program twice across searches

━━━ PRESENTING RESULTS — CRITICAL FORMAT ━━━
Structure every response that includes programs like this:

**Found [N] programs for [brief description of who they are].**

For each top program (2-4 max), show:
**[Program Name]** — [Agency, State/Federal]
💰 Up to [amount] | 🗓 [deadline or "Rolling"]
Eligibility confidence: [HIGH / MEDIUM / LOW] — [1-sentence reason why]
[2-3 sentence description: what it funds, why it fits THIS specific user, the #1 requirement to watch]

Then a brief "**Also worth checking:**" section for 1-2 more with just name + one sentence.

End with: "Want me to walk through how to apply for [top match]? Or do you have eligibility questions about any of these?"

━━━ ELIGIBILITY CONFIDENCE ━━━
After every program you surface, always rate confidence as HIGH / MEDIUM / LOW:
- HIGH: User clearly meets the stated eligibility criteria based on what they told you
- MEDIUM: Likely eligible but missing one piece of info (size threshold, specific activity type, etc.)
- LOW: Worth checking but there's a real eligibility risk they should verify

If confidence is MEDIUM or LOW, briefly say what would confirm or disqualify them.

━━━ TONE ━━━
- Honest and direct — if a program is unlikely to fit, say so rather than padding the list
- Encouraging but not hype — don't promise funding, describe opportunity
- Conversational — use plain language, not bureaucratic boilerplate
- Efficient — the user came here to find money, not to read walls of text`;


export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return new Response(
      JSON.stringify({ error: "AI features require an ANTHROPIC_API_KEY — add it to your .env file." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
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
