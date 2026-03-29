// ─── StateSubsidies Logo ────────────────────────────────────────────────────
// Mark: simplified SVG outline of the continental United States
// Wordmark: map mark + divider + stacked "State / Subsidies" text

interface LogoMarkProps {
  /** Height in px; width is calculated from the US map's ~1.54:1 aspect ratio */
  height?: number;
  /** Alias for height — kept for backward compat */
  size?: number;
  className?: string;
}

/**
 * Continental US silhouette mark.
 * Path is a simplified but geographically faithful outline of the 48 contiguous states.
 */
export function LogoMark({ height, size, className }: LogoMarkProps) {
  const h = height ?? size ?? 36;
  const width = Math.round(h * 1.54);
  return (
    <svg
      width={width}
      height={h}
      viewBox="0 0 200 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="us-fill" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#1a37c8" />
          <stop offset="100%" stopColor="#0d2052" />
        </linearGradient>
        {/* Subtle highlight along the top edge */}
        <linearGradient id="us-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Continental US outline ───────────────────────────────────────── */}
      {/*
        Path traces clockwise from Pacific NW:
        → east along Canadian border → Atlantic coast (south) →
        Gulf Coast (west) → Pacific coast (north) → close
      */}
      <path
        d={`
          M 3,10
          L 32,6
          L 97,6
          C 103,8 112,9 120,11
          L 132,13
          C 136,15 139,18 141,21
          L 156,19
          C 167,15 182,11 197,13
          C 199,15 200,18 199,21
          C 197,24 194,25 191,23
          L 181,28
          L 175,31
          C 171,35 169,37 169,39
          L 167,51
          L 159,61
          L 149,71
          L 151,87
          C 153,94 152,100 144,103
          C 139,105 136,102 135,97
          C 136,91 137,87 139,85
          L 129,79
          C 123,80 119,81 113,83
          C 107,84 101,85 91,89
          L 83,99
          L 79,109
          C 74,113 69,111 64,107
          C 59,101 57,91 57,83
          L 45,81
          L 29,85
          L 21,83
          L 16,73
          C 12,64 7,55 5,47
          C 4,39 4,33 3,25
          C 3,18 3,13 3,10
          Z
        `}
        fill="url(#us-fill)"
      />

      {/* Subtle top-edge highlight (makes it feel less flat) */}
      <path
        d={`
          M 3,10
          L 32,6
          L 97,6
          C 103,8 112,9 120,11
          L 132,13
          C 136,15 139,18 141,21
          L 156,19
          C 167,15 182,11 197,13
          C 199,15 200,18 199,21
          C 197,24 194,25 191,23
          L 181,28
          L 175,31
          C 171,35 169,37 169,39
          L 167,51
        `}
        fill="none"
        stroke="url(#us-top)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* ── State activity indicators: CA, TX, NY, IL ────────────────────── */}
      {/* California */}
      <circle cx="14" cy="64" r="3.5" fill="#22c55e" opacity="0.95" />
      <circle cx="14" cy="64" r="6"   fill="#4ade80" opacity="0.2" />

      {/* Texas */}
      <circle cx="68" cy="88" r="3.5" fill="#22c55e" opacity="0.95" />
      <circle cx="68" cy="88" r="6"   fill="#4ade80" opacity="0.2" />

      {/* Illinois/Midwest */}
      <circle cx="120" cy="36" r="3"   fill="#22c55e" opacity="0.95" />
      <circle cx="120" cy="36" r="5.5" fill="#4ade80" opacity="0.18" />

      {/* New York */}
      <circle cx="170" cy="26" r="3"   fill="#22c55e" opacity="0.95" />
      <circle cx="170" cy="26" r="5.5" fill="#4ade80" opacity="0.18" />

      {/* ── Alaska inset (small, bottom-left) ────────────────────────────── */}
      <g transform="translate(4,95) scale(0.32)">
        <path
          d={`M 0,20 L 5,10 L 15,8 L 30,12 L 40,5 L 52,8 L 60,18
              L 55,28 L 45,32 L 38,24 L 28,28 L 20,35 L 10,32 Z`}
          fill="#1a37c8"
          opacity="0.75"
        />
      </g>

      {/* ── Hawaii inset (small dots, bottom-center) ──────────────────────── */}
      <ellipse cx="44" cy="118" rx="4"   ry="2.5" fill="#1a37c8" opacity="0.7" />
      <ellipse cx="51" cy="120" rx="3"   ry="2"   fill="#1a37c8" opacity="0.65" />
      <ellipse cx="57" cy="121" rx="2"   ry="1.5" fill="#1a37c8" opacity="0.6" />
    </svg>
  );
}

export function LogoWordmark({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      {/* US map mark */}
      <LogoMark height={34} />

      {/* Vertical divider */}
      <span
        className="self-stretch w-px"
        style={{ background: dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)" }}
        aria-hidden="true"
      />

      {/* Stacked wordmark */}
      <span className="flex flex-col leading-none">
        <span
          className={`font-extrabold text-[15px] tracking-tight ${
            dark ? "text-white/80" : "text-slate-500"
          }`}
        >
          State
        </span>
        <span
          className={`font-extrabold text-[18px] tracking-tight ${
            dark ? "text-white" : "text-slate-900"
          }`}
          style={{ marginTop: "-1px" }}
        >
          Subsidies
          <span
            className="font-semibold text-[11px] align-baseline ml-0.5"
            style={{ color: dark ? "rgba(255,255,255,0.45)" : "#94a3b8" }}
          >
            .com
          </span>
        </span>
      </span>
    </span>
  );
}

/** @deprecated Use LogoWordmark */
export function LogoFull({ className }: { className?: string }) {
  return <LogoWordmark className={className} />;
}
