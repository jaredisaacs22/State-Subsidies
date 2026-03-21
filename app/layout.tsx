import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SubsidyFinder — Business Incentives & Government Grants",
  description:
    "Discover Federal, State, City, and Agency grants, tax credits, rebates, and incentives for your business. " +
    "Filter by industry, jurisdiction, and incentive type.",
  keywords: ["government grants", "business subsidies", "tax credits", "rebates", "CARB", "CalTrans", "WAZIP"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-semibold text-slate-900 text-lg tracking-tight">SubsidyFinder</span>
              <span className="hidden sm:inline text-xs text-slate-400 font-normal ml-1">Business Incentives</span>
            </a>

            <nav className="flex items-center gap-1">
              <a href="/" className="btn-ghost text-sm">Browse</a>
              <a
                href="https://github.com/jaredisaacs22/State-Subsidies"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-sm hidden sm:flex"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">SubsidyFinder</p>
                <p className="text-sm text-slate-500 mt-1">
                  Helping businesses discover government incentives. Data sourced from official .gov and agency sites.
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Not financial or legal advice. Verify eligibility with the managing agency.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
