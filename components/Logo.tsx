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
        {/* Deep navy sky */}
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0d2052" />
          <stop offset="100%" stopColor="#163884" />
        </linearGradient>
        {/* Main peak: ice white fading down */}
        <linearGradient id="peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c8daf4" />
        </linearGradient>
        {/* Back range: muted blue */}
        <linearGradient id="range" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#2a4f9e" />
          <stop offset="100%" stopColor="#1e3c7a" />
        </linearGradient>
      </defs>

      {/* Background: deep navy badge */}
      <rect width="32" height="32" rx="7" fill="url(#sky)" />

      {/* Subtle warm horizon glow */}
      <ellipse cx="16" cy="22" rx="18" ry="5" fill="#c4851a" opacity="0.07" />

      {/* Sun — warm amber, top right */}
      <circle cx="24" cy="8" r="2.8" fill="#f59e0b" opacity="0.92" />
      <circle cx="24" cy="8" r="4.5" fill="#fbbf24" opacity="0.10" />

      {/* Back mountain range — muted, sits behind main peak */}
      <polygon points="14,24 22,12 30,24" fill="url(#range)" opacity="0.65" />

      {/* Main peak — dominant, crisp white */}
      <polygon points="2,26 13,8 24,26" fill="url(#peak)" />

      {/* Snow cap highlight */}
      <polygon points="11,11.5 13,8 15,11.5" fill="white" opacity="0.95" />

      {/* Forest treeline — smooth organic curve */}
      <path
        d="M0,26 C4,23.5 7,25 10,23.5 C13,22 15.5,24 19,23.5 C22,23 25,24.5 28,23 C29.5,22.5 31,23.5 32,23 L32,32 L0,32 Z"
        fill="#1a5c38"
      />
      {/* Treeline depth layer */}
      <path
        d="M0,27.5 C3,25.5 6,26.5 9,25.5 C12,24.5 16,26 20,25 C23,24.5 27,26 32,25 L32,32 L0,32 Z"
        fill="#22613a"
        opacity="0.5"
      />
    </svg>
  );
}

export function LogoWordmark({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={32} />
      <span className={`font-bold text-lg tracking-tight leading-none ${dark ? "text-white" : "text-slate-900"}`}>
        State<span className="text-forest-700">Subsidies</span>
      </span>
    </span>
  );
}

/** @deprecated Use LogoWordmark */
export function LogoFull({ className }: { className?: string }) {
  return <LogoWordmark className={className} />;
}
