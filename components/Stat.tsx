"use client";

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * SS-005 — Headline stat with live `as of` timestamp and methodology link.
 * Use `dark` for hero / dark-background contexts (default: false = light bg).
 */
export function Stat({
  value,
  label,
  asOf,
  methodologyAnchor,
  dark = false,
}: {
  value: string | number;
  label: string;
  asOf?: Date | null;
  methodologyAnchor: string;
  dark?: boolean;
}) {
  const displayValue = typeof value === "number" ? value.toLocaleString() : value;

  if (dark) {
    return (
      <div className="flex flex-col items-center text-center min-w-0">
        <span className="stat-number text-xl font-bold text-white leading-tight tabular-nums">{displayValue}</span>
        <span className="text-white/35 text-[10px] font-medium uppercase tracking-widest mt-0.5 whitespace-nowrap">{label}</span>
        {asOf && (
          <span className="hidden sm:inline-block text-white/20 text-[9px] mt-0.5">
            <time dateTime={asOf.toISOString()}>{formatShort(asOf)}</time>
            {" · "}
            <a href={`/methodology#${methodologyAnchor}`} className="underline hover:text-white/40 transition-colors">
              Methodology
            </a>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold text-slate-900">{displayValue}</span>
      <span className="text-xs text-slate-600 mt-0.5">{label}</span>
      {asOf && (
        <span className="text-[10px] text-slate-500 mt-0.5">
          as of{" "}
          <time dateTime={asOf.toISOString()}>{formatShort(asOf)}</time>
          {" · "}
          <a href={`/methodology#${methodologyAnchor}`} className="underline hover:text-slate-700 transition-colors">
            Methodology
          </a>
        </span>
      )}
    </div>
  );
}
