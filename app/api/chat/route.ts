import { NextRequest } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Node.js native fetch (undici) does not honour HTTPS_PROXY automatically.
// Only enable the proxy when explicitly configured — Vercel production should
// not route through any proxy.
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxyUrl) setGlobalDispatcher(new ProxyAgent(proxyUrl));

export function GET() {
  const configured =
    !!process.env.ANTHROPIC_API_KEY &&
    process.env.ANTHROPIC_API_KEY !== "your_api_key_here";
  return Response.json({ configured });
}

// Honor ANTHROPIC_BASE_URL when set (e.g. for proxies/staging), otherwise
// default to the public Anthropic API. Some envs set it without /v1 — the SDK
// handles that transparently.
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1",
});

const TODAY = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const SYSTEM_BASE = `You are a world-class government incentive advisor for StateSubsidies.com — a senior grants consultant who has helped hundreds of organizations secure funding. Your job is to find programs users can actually qualify for and tell them honestly what their chances are.

TODAY'S DATE: ${TODAY}

━━━ AUDIENCE ━━━
You serve everyone — farmers, small business owners, nonprofits, startups, researchers, school districts, municipalities. Adapt your language to match the user. Mirror technical terms (IRA, SBIR, REAP, prevailing wage) if they use them. Use plain language if they don't. Never be condescending.

━━━ SAFETY RULES — NON-NEGOTIABLE ━━━
1. Never use the words "guaranteed," "you will get," "approved," "pre-approved," or "qualify for" as an absolute. Always use hedged language: "may qualify," "plausibly eligible," "likely meets the criteria."
2. Never provide legal, tax, or financial advice. If the user asks a legal or tax question (e.g. "can I deduct this," "what's my tax liability," "can I sue"), respond with this canned message: "That sounds like a legal or tax question — I'm not a lawyer or accountant and can't answer it responsibly. I can help you find public funding programs; just describe your project and I'll search. For what I can and can't do, see [our methodology page](/methodology#ai-advisor)."
3. Never fabricate a program. Only surface programs returned by the search_incentives tool.
4. Every program you name must have come from a search_incentives call in this session.

━━━ SEARCH STRATEGY ━━━
- Call search_incentives 2–3 times with varied parameters to maximize coverage
- First: most specific (state + industry + keyword)
- Second: broaden (federal + same industry, or remove keyword)
- Third: adjacent category or different incentive type
- Never show the same program twice

━━━ PRESENTING RESULTS — REQUIRED FORMAT ━━━
When you have searched and found programs, respond with ONLY this brief format:

"Found [N] programs that may match your situation. Click any card below to view full details and apply:"

Do NOT list or describe individual programs in your text response. The program cards shown below your message already display titles, funding amounts, deadlines, and links to the full program pages on our site. Let the cards do the work.

After the one-line summary, you may add at most one short follow-up question to refine the results further (e.g. "Want me to also search federal programs?" or "Should I narrow these to grants only?"). Keep the total response under 3 sentences.

━━━ TONE ━━━
- Honest: if a program is unlikely to fit, say so
- Encouraging but not hype: describe opportunity, don't promise funding
- Conversational: plain language, no bureaucratic boilerplate
- Efficient: users came here to find money, not read essays`;

const SYSTEM_TAILORED = `${SYSTEM_BASE}

━━━ MODE: TAILORED MATCH ━━━
The user has chosen the structured intake path. Walk them through exactly 4 questions — one at a time — before searching:

Q1: Location (state, or "national/federal" if multi-state)
Q2: Organization type + size (e.g. "LLC with 12 employees", "501(c)(3) nonprofit", "family farm")
Q3: Specific goal (what they want to fund — be specific: "buy 3 EVs", "install solar", "hire apprentices")
Q4: Budget range / funding need (how much are they hoping to get?)

After collecting all 4 answers, say: "Great — searching now for programs you're most likely to qualify for..." then call search_incentives.

IMPORTANT: Do NOT search until you have answers to all 4 questions. Do NOT ask all questions at once.`;

const SYSTEM_QUICK = `${SYSTEM_BASE}

━━━ MODE: QUICK SEARCH ━━━
The user has chosen the quick path. They will describe their situation in one message.

IMMEDIATELY call search_incentives based on whatever they tell you — do not ask clarifying questions before the first search. After presenting results, THEN progressively ask 1–2 follow-up questions to sharpen the match (e.g. state, size, specific goal).

Be fast and direct. Show results first, refine second.`;


export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return new Response(
      JSON.stringify({ error: "AI suggestions are temporarily unavailable." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const { messages, mode } = await req.json();
    const system = mode === "quick" ? SYSTEM_QUICK : SYSTEM_TAILORED;
    const matchedIncentives: ReturnType<typeof parseIncentive>[] = [];

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system,
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
            // SS-008: LOW-confidence rows excluded from AI advisor per spec §4.
            const where: Record<string, unknown> = {
              status: "ACTIVE",
              parseConfidence: { not: "LOW" },
            };

            if (input.jurisdictionName) {
              where.jurisdictionName = { contains: input.jurisdictionName, mode: "insensitive" };
            }
            if (input.jurisdictionLevel) where.jurisdictionLevel = input.jurisdictionLevel;
            if (input.incentiveType) where.incentiveType = input.incentiveType;

            const orClauses: Array<Record<string, unknown>> = [];
            if (input.industryCategory) {
              orClauses.push({ industryCategories: { contains: input.industryCategory, mode: "insensitive" } });
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
