import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url     = searchParams.get("url") ?? "";
  const title   = searchParams.get("title") ?? "";
  const agency  = searchParams.get("agency") ?? "";

  if (!url) return new Response("Missing url", { status: 400 });

  const googleFallback = `https://www.google.com/search?q=${encodeURIComponent(
    `${title} ${agency} official site`
  )}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // Mimic a real browser so government firewalls don't block us
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    clearTimeout(timer);

    // 404 / 410 = page is gone → Google search
    if (res.status === 404 || res.status === 410) {
      const r = NextResponse.redirect(googleFallback, 302);
      r.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      return r;
    }

    // Any other response (200, 403, 405, 5xx…) means the server replied —
    // redirect to the real URL; the user's browser handles auth/cookies.
    const r = NextResponse.redirect(url, 302);
    r.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    return r;
  } catch {
    // Network error, timeout, or DNS failure → Google fallback
    const r = NextResponse.redirect(googleFallback, 302);
    r.headers.set("Cache-Control", "public, max-age=60");
    return r;
  }
}
