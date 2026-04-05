// ─── StateSubsidies Logo ─────────────────────────────────────────────────────
//
// LogoMark: Albers USA projection map extracted from us-atlas@3 TopoJSON.
// Paths are RDP-simplified to keep the SVG lightweight.
// viewBox is 200 × 130 (matching the Albers USA aspect ratio).
//
// NATION_PATH  — filled silhouette (continental US + Alaska inset + Hawaii)
// MESH_PATH    — internal state borders, stroked at low opacity
// ─────────────────────────────────────────────────────────────────────────────

const NATION_PATH =
  "M13.7,5.1L19.7,7.1L18.6,12.1L20.8,3.1L67.9,13.1L107,13.5L110.7,17.6L124.5,19.4L116.9,26.4L129.5,21.6L128.3,25.3L142.4,24.9L144.8,27.5L133.3,29.3L130.6,35.1L133.7,32L131.4,42.3L134.4,50.1L139.9,29L145.6,30.7L144.6,38.4L149,37.4L147.6,48.2L151.2,49.3L161.8,41.6L161.4,38.1L170.7,34.9L173.4,26.9L186.4,22.3L188.7,10.3L193.7,10.8L199.4,20.5L189.8,31L189.6,36.5L193.9,39L182.1,45L188.1,43.2L181.1,46.9L180.1,56L176.8,53.2L180,58.7L178.3,65.7L175.5,53.9L173.6,55.9L175.8,61.6L171.8,60.4L176.9,66.2L174.3,66L180.9,71.9L178.5,68.7L179.6,70.7L176.1,70.4L180.4,72.8L175.6,74.4L176.3,76.9L179.8,75.8L162.8,95.8L163.1,103.1L171.3,119L170.4,128.2L161.9,120.9L154,106.1L148.7,108.5L136.1,104.4L128.9,108.3L131.5,108.3L131,113.4L120.8,109.6L108,110.6L98.7,120.9L98.8,128.3L98,122.1L101.9,116.9L97.4,119.7L97.5,129.4L90.6,126.6L81.6,109.7L73.1,112.6L62,98.1L43.4,97.6L30.2,88.2L20.7,87L17,78.5L9.7,73.8L8.1,55.2L4.2,49.8L6.8,30.3L14.8,15.2L13.7,5.1Z " +
  // Alaska
  "M10.6,109.3L15.5,109.1L12.4,105L18.6,100.8L27.7,102.8L30.7,118.5L35.3,118.3L42,125.2L35.5,119.1L25.7,117.9L22,121.6L23.6,117.4L16,126.9L9.7,128.9L17.6,122L11,118.4L15.4,111.7L10.6,109.3Z " +
  // Hawaii
  "M63.6,126.6L64.5,124L69.1,127.9L65.4,130.7L63.6,126.6Z " +
  "M58,120L60.7,119.7L58,120Z M53.8,117.7L56.5,119L53.8,117.7Z M47.1,115.4L49.3,114.9L47.1,115.4Z";

const MESH_PATH =
  "M134.7,106.1L133.7,83.1L143.6,82.3L148.1,101.6L137.6,102.7L138.3,106.2 " +
  "M30.2,88.2L33.9,81L33.2,71.8L35.4,72.6L36.7,67.9L55.1,71.1L51.4,98.9 " +
  "M148.1,101.6L159.9,103.1L162.5,101 M143.6,82.3L153.1,81L163.8,94.2 " +
  "M135.8,49.3L142.8,48.5L144.5,62.7L136.5,69L132.9,68.8L133.4,49.8 " +
  "M82.1,58.9L107.6,60.2L108.9,74.5L81.2,73.8 " +
  "M189.6,32.5L185.6,22.2 M189.5,39.5L181.4,39.7L181.5,36.3L189.5,33.5 " +
  "M116.7,26.2L114.4,35.9L120.1,41.9L102.2,42.3L99.9,15.3 " +
  "M177,53L179.3,50L177.9,44.3L181.1,46.9 " +
  "M148.5,81.6L157.4,72.4L178.9,68.4 M171.4,83.7L166.3,79.8L153.1,81 " +
  "M101.9,30.3L77.3,29.1L78.5,14.2 " +
  "M108.9,74.5L109.5,91.3L89.5,87.2L88.7,76.7L77.4,76L77.6,73.5 " +
  "M159.9,43.4L175.2,41.6L178.1,44.2 M177.2,52.3L159.3,56.3L157.5,45.3 " +
  "M102.2,42.3L102,47.3L76.1,43.6L77.3,29.1 " +
  "M109.7,91.2L113.8,104L112.6,110.6 M61.7,97.9L75.6,98.2L77.4,76 " +
  "M76.1,43.6L75.3,53.4 " +
  "M57.7,51.4L82.4,54L81.2,73.8L55.1,71.1L57.7,51.4L50.7,50.3L53.7,30.8L76.9,33.7 " +
  "M106.2,59.6L104.6,56.7L118.9,56.2L129.5,73.7L127.6,78.7L125,78.9L109,77 " +
  "M163,55.7L163.4,58.2L167.6,54.9L169.3,57.4L161.2,67.5L157,69.4L154.4,67.4L152.8,63.9L158.1,57L158.6,51.8 " +
  "M120.1,57.4L124.1,50.1L122.3,46.7L132.1,46 M133.2,69.3L129.4,73.7 " +
  "M127.5,78.7L122.8,93.8L111.5,94.2 " +
  "M6.8,34.7L20.9,38.8L17.4,53.2L32.7,77.2 " +
  "M53.3,33.3L47.3,32.9L45.2,26.2L42.7,25.9L44.5,20.9L40.7,16.1L41.3,8.5 " +
  "M184.2,35.7L184.6,23.9 M178.7,25.5L181.5,36.3 " +
  "M14.8,15.2L17.7,19.7L36.5,23.6L32.8,29.6L31,41.3L20.9,38.8 " +
  "M36.7,67.9L41.2,43.6L51.5,45.4 M38.2,7.8L35.5,22.2 M41.2,43.6L31,41.3 " +
  "M130.2,107.3L129.1,103.4L121.4,103.8L124,97.1L122.8,93.8 " +
  "M125.6,83.8L133.7,83.2 M150,73.4L157.4,72.4";

// ── Approximate Albers-USA centers for activity indicators ──────────────────
// (x, y) in the 200×130 viewBox
const DOTS = [
  { x: 16,  y: 63, label: "CA" },
  { x: 83,  y: 98, label: "TX" },
  { x: 133, y: 56, label: "IL" },
  { x: 175, y: 40, label: "NY" },
];

interface LogoMarkProps {
  height?: number;
  /** Alias for height — kept for backward compat */
  size?: number;
  className?: string;
}

export function LogoMark({ height, size, className }: LogoMarkProps) {
  const h = height ?? size ?? 36;
  const w = Math.round(h * (200 / 130));
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 200 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="us-bg" x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%"   stopColor="#2248d4" />
          <stop offset="100%" stopColor="#0d2052" />
        </linearGradient>
        {/* Green glow for activity dots */}
        <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Map fill */}
      <path d={NATION_PATH} fill="url(#us-bg)" />

      {/* State borders — very subtle white lines */}
      <path
        d={MESH_PATH}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Outer edge highlight (top-left rim of light) */}
      <path
        d={NATION_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.75"
      />

      {/* Activity indicators */}
      {DOTS.map(({ x, y, label }) => (
        <g key={label}>
          {/* Glow halo */}
          <circle cx={x} cy={y} r={5} fill="#4ade80" opacity={0.18} />
          {/* Solid dot */}
          <circle cx={x} cy={y} r={2.5} fill="#22c55e" />
          {/* Bright highlight */}
          <circle cx={x - 0.5} cy={y - 0.5} r={0.8} fill="rgba(255,255,255,0.7)" />
        </g>
      ))}
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
      <LogoMark height={36} />

      {/* Vertical rule */}
      <span
        className="self-stretch w-px rounded-full"
        style={{ background: dark ? "rgba(255,255,255,0.2)" : "rgba(15,32,82,0.15)" }}
        aria-hidden="true"
      />

      {/* Stacked wordmark */}
      <span className="flex flex-col leading-none gap-px">
        <span
          className={`text-[13px] font-semibold tracking-widest uppercase ${
            dark ? "text-white/55" : "text-slate-400"
          }`}
        >
          State
        </span>
        <span
          className={`text-[19px] font-extrabold tracking-tight leading-none ${
            dark ? "text-white" : "text-slate-900"
          }`}
        >
          Subsidies
          <span
            className="text-[10px] font-medium ml-0.5 align-baseline"
            style={{ color: dark ? "rgba(255,255,255,0.35)" : "#94a3b8" }}
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
