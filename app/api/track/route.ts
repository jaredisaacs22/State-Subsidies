import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, vid, page, ref, ts, q } = body as Record<string, string>;

    if (!type || !vid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await prisma.pageView.create({
      data: {
        type,
        vid,
        page: page || '/',
        ref: ref || 'direct',
        query: q || null,
        createdAt: ts ? new Date(Number(ts)) : new Date(),
      },
    });

    // Keep only last 5000 events to avoid unbounded growth
    const oldest = await prisma.pageView.findMany({
      orderBy: { createdAt: 'desc' },
      skip: 5000,
      take: 1,
      select: { createdAt: true },
    });
    if (oldest.length > 0) {
      await prisma.pageView.deleteMany({ where: { createdAt: { lte: oldest[0].createdAt } } });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never error on tracking
  }
}
