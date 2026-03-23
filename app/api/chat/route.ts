import { NextRequest } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";

export const dynamic = "force-dynamic";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are an expert incentive-matching assistant for StateSubsidies.com, helping businesses discover government grants, tax credits, subsidies, loans, and rebates.

Your goal: gather just enough context (2-3 conversational turns), then call search_incentives to find the best-fit programs.

Context to collect before searching (you may already have enough from the conversation):
- Business location (state, or "federal" if nationwide)
- Industry or sector
- What they want to do (install EV charging, buy equipment, hire workers, export, R&D, etc.)

Conversation style:
- Be concise and friendly — one question at a time
- If the user gives partial info in their first message, ask only what's still missing
- Once you have state + industry or intent, call search_incentives immediately
- You may call search_incentives up to 3 times with different parameters to broaden results
- Don't ask for employee count or revenue unless truly needed for eligibility

When presenting results:
- Lead with the 2-3 best matches and explain why they fit the user's situation
- Mention funding amounts and deadlines prominently
- If eligibility has key requirements, note them briefly
- End by inviting a follow-up question or suggesting they visit the source URL

Today's date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`;

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
