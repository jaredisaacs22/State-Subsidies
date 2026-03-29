interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background: navy-to-deep-navy diagonal */}
        <linearGradient id="lm-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a37c8" />
          <stop offset="100%" stopColor="#0d2052" />
        </linearGradient>

        {/* Subtle top-left shine on background */}
        <radialGradient id="lm-shine" cx="25%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Pin body: rich navy */}
        <linearGradient id="lm-pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#223ea8" />
          <stop offset="100%" stopColor="#0d1e4a" />
        </linearGradient>

        {/* Bar 1 — shorter, mid-green */}
        <linearGradient id="lm-b1" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#1a7a42" />
          <stop offset="100%" stopColor="#22a85a" />
        </linearGradient>

        {/* Bar 2 — medium, bright green */}
        <linearGradient id="lm-b2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#1a5c38" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>

        {/* Bar 3 — tallest, lightest/most vivid */}
        <linearGradient id="lm-b3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#1a5c38" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>

        {/* Clip bars to the pin silhouette */}
        <clipPath id="lm-clip">
          <path d="M16 3C10.477 3 6 7.477 6 13C6 17.8 9 21.5 12.2 23.2L16 29L19.8 23.2C23 21.5 26 17.8 26 13C26 7.477 21.523 3 16 3Z" />
        </clipPath>
      </defs>

      {/* — Background — */}
      <rect width="32" height="32" rx="7" fill="url(#lm-bg)" />
      <rect width="32" height="32" rx="7" fill="url(#lm-shine)" />

      {/* — Pin drop-shadow (shifted 1px down) — */}
      <path
        d="M16 4C10.477 4 6 8.477 6 14C6 18.8 9 22.5 12.2 24.2L16 30L19.8 24.2C23 22.5 26 18.8 26 14C26 8.477 21.523 4 16 4Z"
        fill="#000"
        opacity="0.22"
      />

      {/* — Pin body — */}
      <path
        d="M16 3C10.477 3 6 7.477 6 13C6 17.8 9 21.5 12.2 23.2L16 29L19.8 23.2C23 21.5 26 17.8 26 13C26 7.477 21.523 3 16 3Z"
        fill="url(#lm-pin)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.75"
      />

      {/* — Bar chart clipped inside pin — */}
      <g clipPath="url(#lm-clip)">
        {/* Baseline rule */}
        <line x1="8" y1="22" x2="24" y2="22" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        {/* Bar 1: shortest */}
        <rect x="9.5" y="17" width="3.5" height="5" rx="1" fill="url(#lm-b1)" />
        {/* Bar 2: medium */}
        <rect x="14.25" y="13" width="3.5" height="9" rx="1" fill="url(#lm-b2)" />
        {/* Bar 3: tallest */}
        <rect x="19" y="9" width="3.5" height="13" rx="1" fill="url(#lm-b3)" />
      </g>

      {/* — Glowing indicator dot above tallest bar — */}
      <circle cx="20.75" cy="7.5" r="2" fill="#86efac" />
      <circle cx="20.75" cy="7.5" r="3.5" fill="#4ade80" opacity="0.18" />
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
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={30} />
      <span
        className={`font-extrabold text-[17px] tracking-tight leading-none ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        State
        <span className="text-forest-700">Subsidies</span>
      </span>
    </span>
  );
}

/** @deprecated Use LogoWordmark */
export function LogoFull({ className }: { className?: string }) {
  return <LogoWordmark className={className} />;
}
