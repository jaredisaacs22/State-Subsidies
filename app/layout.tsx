import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoMark } from "@/components/Logo";
import { Analytics } from "@/components/Analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://statesubsidies.com"),
  title: "StateSubsidies — National Directory of Government Incentives",
  description:
    "A free public directory of 200+ federal, state, city, and agency grants, tax credits, loans, and rebates for U.S. businesses. " +
    "Filter by industry, state, and incentive type across all 50 states.",
  keywords: ["government grants", "business incentives", "tax credits", "rebates", "state incentives", "IRA", "clean energy", "small business grants"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="h-[3px] bg-gradient-to-r from-[#1e1b6b] via-[#0d9488] to-[#1e1b6b] sticky top-0 z-50" />
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200/80 sticky top-[3px] z-50 shadow-[0_1px_12px_rgba(0,0,0,0.05)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between" style={{ height: "3.75rem" }}>
            <a href="/" className="flex items-center gap-2.5 group">
              <LogoMark size={32} />
              <div className="flex flex-col leading-none">
                <span className="font-bold text-slate-900 text-[15.5px] tracking-tight group-hover:text-forest-800 transition-colors">
                  State<span className="text-forest-700">Subsidies</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-400 font-normal tracking-widest uppercase mt-0.5">
                  Federal &amp; State Programs
                </span>
              </div>
            </a>

            <nav className="flex items-center gap-1">
              <a href="/#browse" className="btn-ghost text-sm">Browse</a>
              <a href="/map" className="btn-ghost text-sm hidden sm:flex">Map</a>
              <a href="/saved" className="btn-ghost text-sm hidden sm:flex">Saved</a>
            </nav>
          </div>
        </header>

        <Suspense fallback={null}><Analytics /></Suspense>
        <VercelAnalytics />
        <main>{children}</main>

        <footer className="mt-24 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <LogoMark size={28} />
                  <span className="font-bold text-slate-800 text-[15px]">
                    State<span className="text-forest-700">Subsidies</span>
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  There's a lot of government money out there for businesses. Most of it goes unclaimed because nobody knows it exists. We fixed that.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  All 50 states · sourced from official .gov and agency sites.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm mb-3">Top Categories</p>
                <ul className="space-y-1.5 text-sm text-slate-500">
                  {["EV Charging","Clean Technology","Manufacturing","Agriculture","Real Estate","Healthcare","Energy Storage","Construction"].map((c) => (
                    <li key={c}>
                      <a href={`/?industryCategory=${encodeURIComponent(c)}#browse`} className="hover:text-forest-700 transition-colors">{c}</a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm mb-3">Resources</p>
                <ul className="space-y-1.5 text-sm text-slate-500">
                  <li><a href="/#browse" className="hover:text-forest-700 transition-colors">Browse All Programs</a></li>
                  <li><a href="/map" className="hover:text-forest-700 transition-colors">State Map</a></li>
                  <li><a href="https://www.grants.gov" target="_blank" rel="noopener noreferrer" className="hover:text-forest-700 transition-colors">Grants.gov ↗</a></li>
                  <li><a href="https://www.sba.gov" target="_blank" rel="noopener noreferrer" className="hover:text-forest-700 transition-colors">U.S. Small Business Administration ↗</a></li>
                  <li><a href="https://www.energy.gov" target="_blank" rel="noopener noreferrer" className="hover:text-forest-700 transition-colors">U.S. Dept. of Energy ↗</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-6 text-xs text-slate-400 leading-relaxed">
              <p>
                <strong className="text-slate-500">Independent resource.</strong>{" "}
                StateSubsidies.com is not affiliated with, endorsed by, or acting on behalf of any federal, state, or local government agency.
                All information is provided for general informational purposes only and does not constitute legal, financial, or tax advice.
                Program details, eligibility requirements, and deadlines change frequently — verify directly with the administering agency before making decisions.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
