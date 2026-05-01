import { NextResponse } from "next/server";

export const runtime = "nodejs";

// HTTP statuses we treat as "page is alive" — anything else falls back to a
// Google search for the program. Some agencies block HEAD entirely (405) but
// the page itself is fine; others return 200 on a generic 404 chrome page.
// We pre-flight with HEAD, fall back to GET-with-2KB-read if HEAD is rejected.
function isAlive(status: number): boolean {
  return status >= 200 && status < 400;
}

function googleFallback(title: string, agency: string): string {
  const q = [title, agency].filter(Boolean).join(" ").trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

async function checkUrl(url: string, timeoutMs = 4500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  try {
    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers,
    });
    // Some hosts block HEAD (405 / 403) but serve GET; retry once.
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers,
      });
    }
    return isAlive(res.status);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") ?? "";
  const title = searchParams.get("title") ?? "";
  const agency = searchParams.get("agency") ?? "";

  if (!url) return new Response("Missing url", { status: 400 });

  const alive = await checkUrl(url);
  const target = alive ? url : googleFallback(title || url, agency);

  const r = NextResponse.redirect(target, 302);
  // Cache "alive" for an hour, "dead" only briefly so a fix re-checks soon.
  r.headers.set(
    "Cache-Control",
    alive
      ? "public, max-age=3600, stale-while-revalidate=86400"
      : "public, max-age=300, stale-while-revalidate=900",
  );
  // Surface the decision so the front-end can show a notice if it wants to.
  r.headers.set("X-Source-Status", alive ? "alive" : "dead-fallback-google");
  return r;
}
