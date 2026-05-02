import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Soft-404 URL patterns — sites that redirect to these paths return HTTP 200
// but are actually "page not found" pages. Add new patterns as discovered.
const SOFT_404_PATTERNS = [
  /\/page-not-found/i,
  /\/404/i,
  /\/not-found/i,
  /\/error/i,
  /[?&]error=404/i,
  /grants\.gov\/page-not-found/i,
];

function isAlive(status: number, finalUrl?: string): boolean {
  if (status < 200 || status >= 400) return false;
  if (finalUrl && SOFT_404_PATTERNS.some((p) => p.test(finalUrl))) return false;
  return true;
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
    return isAlive(res.status, res.url);
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
