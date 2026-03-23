import { NextRequest, NextResponse } from "next/server";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { parseIncentive } from "@/lib/utils";

export const dynamic = "force-dynamic";

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are an incentive-matching assistant for StateSubsidies.com. Help businesses find government grants, tax credits, loans, and rebates they qualify for.

Ask short, friendly questions to understand:
- What state they operate in
- Their industry/sector
- Number of employees (1-10, 11-50, 51-500, 500+)
- Annual revenue (under $1M, $1M-$10M, $10M-$100M, $100M+)
- What they want to do (install solar, buy EVs, hire workers, upgrade equipment, etc.)

Once you have enough context (2-3 exchanges), call search_incentives. Be concise and conversational.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const matchedIncentives: ReturnType<typeof parseIncentive>[] = [];

    const { text } = await generateText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      system: SYSTEM,
      messages,
      stopWhen: stepCountIs(3),
      tools: {
        search_incentives: tool({
          description: "Search the incentives database for matching programs.",
          inputSchema: z.object({
            jurisdictionName: z.string().optional().describe("US state name e.g. 'California', or 'United States' for federal"),
            industryCategory: z.string().optional().describe("Industry category"),
            incentiveType: z.enum(["GRANT","TAX_CREDIT","LOAN","VOUCHER","POINT_OF_SALE_REBATE","SUBSIDY"]).optional(),
            jurisdictionLevel: z.enum(["FEDERAL","STATE","CITY","AGENCY"]).optional(),
          }),
          execute: async (input) => {
            const where: Record<string, unknown> = { status: "ACTIVE" };
            if (input.jurisdictionName) where.jurisdictionName = { equals: input.jurisdictionName, mode: "insensitive" };
            if (input.jurisdictionLevel) where.jurisdictionLevel = input.jurisdictionLevel;
            if (input.incentiveType) where.incentiveType = input.incentiveType;
            if (input.industryCategory) where.industryCategories = { contains: input.industryCategory };

            const rows = await prisma.incentive.findMany({ where, take: 8, orderBy: { createdAt: "desc" } });
            const parsed = rows.map((r) => parseIncentive(r as unknown as Record<string, unknown>));
            matchedIncentives.push(...parsed);
            return parsed.map((r) => ({ title: r.title, slug: r.slug, summary: r.shortSummary, type: r.incentiveType, amount: r.fundingAmount }));
          },
        }),
      },
    });

    const seen = new Set<string>();
    const unique = matchedIncentives.filter((i) => seen.has(i.slug) ? false : (seen.add(i.slug), true));

    return NextResponse.json({ message: text, matched: unique });
  } catch (e) {
    console.error("[POST /api/chat]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
