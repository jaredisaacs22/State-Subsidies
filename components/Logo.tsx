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
        <linearGradient id="ss-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a3d6b" />
          <stop offset="100%" stopColor="#021624" />
        </linearGradient>
        <linearGradient id="ss-peak" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#b9dcfe" />
          <stop offset="100%" stopColor="#36a3fa" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="32" height="32" rx="8" fill="url(#ss-bg)" />

      {/* Back mountain — subtle depth */}
      <path d="M1,27 L11,15 L20,27 Z" fill="#1d6fba" fillOpacity="0.35" />

      {/* Main peak */}
      <path d="M8,27 L16,7 L24,27 Z" fill="url(#ss-peak)" />

      {/* Snow cap */}
      <path d="M14.4,11.8 L16,7 L17.6,11.8 Z" fill="white" fillOpacity="0.95" />

      {/* Horizon line */}
      <line x1="2" y1="27" x2="30" y2="27" stroke="white" strokeOpacity="0.1" strokeWidth="0.75" />
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
