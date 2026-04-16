import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SECRET = process.env.DASHBOARD_SECRET || '51432';

export async function GET(req: NextRequest) {
  if (req.headers.get('x-dashboard-secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const events = await prisma.pageView.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const queries = events.filter(e => e.type === 'query');

    return NextResponse.json({
      events: events.map(e => ({
        type: e.type,
        vid: e.vid,
        page: e.page,
        ref: e.ref,
        ts: e.createdAt.getTime(),
        q: e.query ?? undefined,
      })),
      queries: queries.map(e => ({
        type: e.type,
        vid: e.vid,
        page: e.page,
        ref: e.ref,
        ts: e.createdAt.getTime(),
        q: e.query ?? undefined,
      })),
    });
  } catch {
    return NextResponse.json({ events: [], queries: [] });
  }
}
