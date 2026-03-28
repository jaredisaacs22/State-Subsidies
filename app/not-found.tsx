import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="text-7xl font-black text-slate-100 mb-4 select-none">404</div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
      <p className="text-slate-500 text-sm max-w-xs mb-8 leading-relaxed">
        This page doesn&apos;t exist or the program has been removed. Try browsing all active programs instead.
      </p>
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <Link href="/" className="btn-primary">
          Browse Programs
        </Link>
        <Link href="/map" className="btn-ghost border border-slate-200 text-sm">
          Explore by State
        </Link>
      </div>
    </div>
  );
}
