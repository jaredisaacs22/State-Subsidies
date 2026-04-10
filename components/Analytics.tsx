"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Generates or retrieves a persistent visitor ID
function getVid(): string {
  try {
    let vid = localStorage.getItem("ss_vid");
    if (!vid) {
      vid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("ss_vid", vid);
    }
    return vid;
  } catch {
    return "anon";
  }
}

function send(payload: Record<string, string>) {
  // Use sendBeacon when available (survives page unload), fallback to fetch
  const body = JSON.stringify(payload);
  const url = "/api/track";
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
  } else {
    fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }
}

export function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const vid = getVid();
    const ref = document.referrer
      ? new URL(document.referrer).hostname
      : "direct";

    send({
      type: "pageview",
      vid,
      page: pathname,
      ref,
      ts: String(Date.now()),
    });

    // Track search query if present
    const q = searchParams.get("search") || searchParams.get("q");
    if (q) {
      send({
        type: "query",
        vid,
        page: pathname,
        ref,
        ts: String(Date.now()),
        q,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
