import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? "";

  if (!url) return new Response("Missing url", { status: 400 });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    clearTimeout(timer);

    const r = NextResponse.redirect(url, 302);
    // Cache successful HEAD checks for 1 hour
    if (res.ok) r.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    else r.headers.set("Cache-Control", "no-store");
    return r;
  } catch {
    // Network error or timeout — redirect directly; browser will handle
    return NextResponse.redirect(url, 302);
  }
}
