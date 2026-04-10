import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SECRET = process.env.DASHBOARD_SECRET || '51432';

async function upstashCmd(url: string, token: string, cmd: unknown[]) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  });
  const data = await res.json();
  return data.result || [];
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-dashboard-secret',
    },
  });
}

export async function GET(req: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (req.headers.get('x-dashboard-secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ events: [], queries: [], error: 'Upstash not configured' }, { headers });
  }

  const [rawEvents, rawQueries] = await Promise.all([
    upstashCmd(url, token, ['LRANGE', 'ss:events', 0, 1999]),
    upstashCmd(url, token, ['LRANGE', 'ss:queries', 0, 499]),
  ]);

  const parse = (arr: string[]) =>
    arr.map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);

  return NextResponse.json(
    { events: parse(rawEvents), queries: parse(rawQueries) },
    { headers }
  );
}
