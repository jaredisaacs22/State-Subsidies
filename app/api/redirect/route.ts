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
];

// Block private IPs, link-local, and IMDS (169.254.169.254) to prevent SSRF
// to internal cloud metadata or internal services. Hostnames are checked
// after URL parsing, before any outbound fetch is made.
const BLOCKED_HOST_RE =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|localhost$|::1$|\[::1\])/i;

function isHostBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (BLOCKED_HOST_RE.test(h)) return true;
  // Also reject anything that doesn't look like a public DNS name
  if (!h.includes(".") && h !== "localhost") return true;
  return false;
}

// Validate a user-supplied URL before we either fetch it or redirect a
// browser to it. Returns the parsed URL if safe, throws if not.
function assertSafeUrl(raw: string): URL {
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("scheme not allowed");
  }
  if (isHostBlocked(parsed.hostname)) {
    throw new Error("host not allowed");
  }
  return parsed;
}

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

  // Manual redirect handling — we follow up to 3 hops, validating each
  // destination against the SSRF block list. A trusted public host could
  // otherwise 302 to 169.254.169.254 and exfiltrate cloud metadata.
  const MAX_HOPS = 3;
  let current = url;

  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      try { assertSafeUrl(current); } catch { return false; }
      let res = await fetch(current, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "manual",
        headers,
      });
      if (res.status === 405 || res.status === 403 || res.status === 501) {
        res = await fetch(current, {
          method: "GET",
          signal: controller.signal,
          redirect: "manual",
          headers,
        });
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return false;
        // Resolve relative redirects against the current URL
        current = new URL(loc, current).toString();
        continue;
      }
      return isAlive(res.status, current);
    }
    return false; // too many redirects
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawUrl = (searchParams.get("url") ?? "").slice(0, 2048);
  const title = (searchParams.get("title") ?? "").slice(0, 300);
  const agency = (searchParams.get("agency") ?? "").slice(0, 300);

  if (!rawUrl) return new Response("Missing url", { status: 400 });

  // Validate URL up front — unsafe URLs go straight to Google fallback
  // without ever being fetched server-side or returned in a Location header.
  let alive = false;
  let safeUrl: string | null = null;
  try {
    const parsed = assertSafeUrl(rawUrl);
    safeUrl = parsed.toString();
    alive = await checkUrl(safeUrl);
  } catch {
    safeUrl = null;
  }

  const target = alive && safeUrl ? safeUrl : googleFallback(title || rawUrl, agency);

  const r = NextResponse.redirect(target, 302);
  // Private cache only — the response is keyed on a user-supplied parameter
  // and would be a cache-poisoning vector if shared across users.
  r.headers.set(
    "Cache-Control",
    alive ? "private, max-age=3600" : "private, max-age=300",
  );
  r.headers.set("X-Source-Status", alive ? "alive" : "dead-fallback-google");
  return r;
}
