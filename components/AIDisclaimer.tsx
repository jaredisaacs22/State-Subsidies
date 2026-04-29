/**
 * SS-008 per-message disclaimer — rendered once under every completed
 * assistant turn. Keeps StateSubsidies inside the informational-tool
 * lane and out of the legal/tax/financial-advice lane.
 *
 * Legal sign-off: Okonkwo OKONKWO-01 (binding gate before full SS-008 ship).
 * Copy version: v1 — must not be changed without legal re-review.
 */
export function AIDisclaimer() {
  return (
    <p role="note" className="mt-1.5 text-[11px] text-white/35 leading-snug">
      Informational only — not legal, tax, or financial advice. Programs change; always confirm eligibility on the official source page.{" "}
      <a
        href="/methodology#ai-advisor"
        className="underline underline-offset-2 hover:text-white/60 transition-colors"
      >
        How this works.
      </a>
    </p>
  );
}

export default AIDisclaimer;
