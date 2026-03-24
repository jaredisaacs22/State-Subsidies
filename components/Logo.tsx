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
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0053a2" />
          <stop offset="100%" stopColor="#0087eb" />
        </linearGradient>
        <linearGradient id="peakLeft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2f0ff" />
          <stop offset="100%" stopColor="#a8d4f7" />
        </linearGradient>
        <linearGradient id="peakRight" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c8e6ff" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill="url(#skyGrad)" />

      <circle cx="22" cy="9" r="3" fill="#fbbf24" opacity="0.85" />
      <circle cx="22" cy="9" r="5" fill="#fde68a" opacity="0.2" />

      <polygon points="3,26 12,13 19,26" fill="#1d6fba" opacity="0.55" />
      <polygon points="9,26 16,9 23,26" fill="url(#peakLeft)" />
      <polygon points="14,13 16,9 18,13" fill="white" opacity="0.9" />
      <polygon points="16,26 24,14 32,26" fill="url(#peakRight)" opacity="0.8" />

      <polygon points="2,26 4.5,21 7,26" fill="#166534" opacity="0.65" />
      <polygon points="5,26 7,22 9,26" fill="#15803d" opacity="0.55" />
      <polygon points="23,26 25.5,21.5 28,26" fill="#166534" opacity="0.55" />

      <rect x="0" y="26" width="32" height="6" rx="0" fill="#052e16" opacity="0.4" />
    </svg>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={32} />
      <span className="font-bold text-slate-900 text-lg tracking-tight leading-none">
        State<span className="text-brand-600">Subsidies</span>
      </span>
    </span>
  );
}
