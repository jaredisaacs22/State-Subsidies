/**
 * SS-001 Trust Ribbon — preview-only page.
 *
 * Lets SS-001 owners (Aristov, Reeves) review the component visually
 * without it appearing on the live home page. Not linked from anywhere
 * in the navigation; reachable only at /preview/trust-ribbon.
 */

import { TrustRibbon } from "@/components/TrustRibbon";

export const dynamic = "force-dynamic";

export default function TrustRibbonPreviewPage() {
  return (
    <div>
      <TrustRibbon />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Trust Ribbon — preview
        </h1>
        <p className="text-sm text-slate-600 max-w-prose">
          Server-rendered <code className="font-mono text-xs px-1 py-0.5 bg-slate-100 rounded">{"<TrustRibbon />"}</code>.
          Reads counts from <code className="font-mono text-xs">/api/stats</code> and the latest
          {" "}
          <code className="font-mono text-xs">ScrapeRun</code> record. Until ScrapeRun
          has rows (post-promotion to live writes), the &ldquo;updated&rdquo; field
          renders as &ldquo;never&rdquo; — that&rsquo;s expected during the dry-run
          window.
        </p>
        <p className="text-sm text-slate-500 mt-4">
          Spec: <code className="font-mono text-xs">docs/scope/items/SS-001-hero-and-trust-ribbon.md</code>
        </p>
      </main>
    </div>
  );
}
