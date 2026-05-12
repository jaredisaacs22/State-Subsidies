import { CheckCircle2, RefreshCw } from "lucide-react";

/**
 * Trust signal next to the title showing when the program was last verified
 * or, falling back, when it was last re-scraped. Verified-by-human gets a
 * stronger visual treatment than automated checks.
 */
export function FreshnessBadge({
  updatedAt,
  lastVerifiedAt,
}: {
  updatedAt: string;
  lastVerifiedAt: string | null;
}) {
  const verified = !!lastVerifiedAt;
  const dateStr = verified ? lastVerifiedAt! : updatedAt;
  const date = new Date(dateStr);
  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  const label =
    daysAgo === 0
      ? "today"
      : daysAgo === 1
      ? "yesterday"
      : daysAgo < 30
      ? `${daysAgo} days ago`
      : daysAgo < 60
      ? "1 month ago"
      : daysAgo < 365
      ? `${Math.floor(daysAgo / 30)} months ago`
      : `${Math.floor(daysAgo / 365)} year${daysAgo >= 730 ? "s" : ""} ago`;

  const tooltip = verified
    ? `Manually verified on ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
    : `Last refreshed from the source on ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <span
      title={tooltip}
      className={
        "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium " +
        (verified
          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
          : "bg-slate-100 text-slate-500 border border-slate-200")
      }
    >
      {verified ? (
        <CheckCircle2 size={10} aria-hidden />
      ) : (
        <RefreshCw size={10} aria-hidden />
      )}
      {verified ? "Verified" : "Refreshed"} {label}
    </span>
  );
}
