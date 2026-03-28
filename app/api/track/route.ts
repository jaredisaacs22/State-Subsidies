import { NextRequest, NextResponse } from 'next/server';

const ORIGIN = 'https://www.statesubsidies.com';

async function upstash(url: string, token: string, command: unknown[]) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  return res.json();
}

export const runtime = 'edge';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': ORIGIN,
    'Content-Type': 'application/json',
  };

  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers });
  }

  const { type, vid, page, ref, ts, q } = body as Record<string, string>;

  if (!type || !vid) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
  }

  const event = JSON.stringify({
    type,
    vid,
    page: page || '/',
    ref: ref || 'direct',
    ts: ts || Date.now(),
    ...(q ? { q } : {}),
  });

  const listKey = type === 'query' ? 'ss:queries' : 'ss:events';
  await upstash(UPSTASH_URL, UPSTASH_TOKEN, ['LPUSH', listKey, event]);
  await upstash(UPSTASH_URL, UPSTASH_TOKEN, ['LTRIM', listKey, 0, 4999]);

  return NextResponse.json({ ok: true }, { status: 200, headers });
}
