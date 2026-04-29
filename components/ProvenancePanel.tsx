"use client";

/**
 * SS-003 ProvenancePanel — full source citation block for incentive detail pages.
 *
 * Shows: source link, source hash (truncated + copy), first/last seen,
 * last verified, parse confidence + notes, methodology link.
 */

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import type { Incentive, ParseConfidence } from "@/lib/types";

type Props = {
  incentive: Pick<
    Incentive,
    | "sourceUrl"
    | "sourceDomain"
    | "sourceHash"
    | "parseConfidence"
    | "parseNotes"
    | "firstSeenAt"
    | "lastSeenAt"
    | "lastVerifiedAt"
    | "lastVerifiedBy"
    | "scrapedAt"
  >;
};

const CONFIDENCE_STYLES: Record<ParseConfidence, { badge: string; label: string }> = {
  HIGH:   { badge: "bg-emerald-100 text-emerald-800", label: "High — all required fields matched" },
  MEDIUM: { badge: "bg-amber-100  text-amber-800",   label: "Medium — some fields estimated" },
  LOW:    { badge: "bg-red-100    text-red-800",      label: "Low — parse incomplete" },
};

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function CopyHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  const short = hash.slice(0, 7);

  async function copy() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <span className="inline-flex items-center gap-1">
      <code className="font-mono text-[11px] text-slate-600">{short}…</code>
      <button
        onClick={copy}
        title="Copy full hash"
        aria-label="Copy source hash"
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      </button>
    </span>
  );
}

export function ProvenancePanel({ incentive }: Props) {
  const conf = incentive.parseConfidence ?? "MEDIUM";
  const styles = CONFIDENCE_STYLES[conf];

  return (
    <div className="card p-5 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Provenance</p>

      <div className="space-y-2 text-xs text-slate-700">

        {/* Source */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-slate-500 w-24 flex-shrink-0">Source</span>
          <a
            href={incentive.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline flex items-center gap-1 min-w-0 truncate"
          >
            {incentive.sourceDomain || new URL(incentive.sourceUrl).hostname}
            <ExternalLink size={10} className="flex-shrink-0" />
          </a>
        </div>

        {/* Hash */}
        {incentive.sourceHash && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 w-24 flex-shrink-0">Source hash</span>
            <CopyHash hash={incentive.sourceHash} />
          </div>
        )}

        {/* Confidence */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500 w-24 flex-shrink-0">Confidence</span>
          <span className={`badge text-[10px] font-semibold ${styles.badge}`}>{conf}</span>
        </div>
        {incentive.parseNotes && (
          <p className="text-[11px] text-slate-500 pl-[6.5rem] -mt-1 leading-snug">
            {incentive.parseNotes}
          </p>
        )}

        {/* First / last seen */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500 w-24 flex-shrink-0">First seen</span>
          <span>{fmt(incentive.firstSeenAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500 w-24 flex-shrink-0">Last seen</span>
          <span>{fmt(incentive.lastSeenAt)}</span>
        </div>

        {/* Human verification */}
        {incentive.lastVerifiedAt && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 w-24 flex-shrink-0">Verified</span>
            <span>
              {fmt(incentive.lastVerifiedAt)}
              {incentive.lastVerifiedBy && (
                <span className="text-slate-500"> by {incentive.lastVerifiedBy}</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Footer links */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-100 text-[11px]">
        <a
          href="/methodology"
          className="text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
        >
          Methodology
        </a>
        <span className="text-slate-300">·</span>
        <a
          href={`/report?slug=${encodeURIComponent(incentive.sourceUrl)}`}
          className="text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
        >
          Report an error
        </a>
      </div>
    </div>
  );
}

export default ProvenancePanel;
