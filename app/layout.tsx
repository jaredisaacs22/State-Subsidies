import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LogoMark } from "@/components/Logo";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://statesubsidies.com"),
  title: "StateSubsidies — Business Incentives & Government Grants",
  description:
    "Discover 100+ Federal, State, City, and Agency grants, tax credits, rebates, and incentives for your business. " +
    "Filter by industry, jurisdiction, and incentive type across all 50 states.",
  keywords: ["government grants", "business subsidies", "tax credits", "rebates", "state incentives", "IRA", "clean energy"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <LogoMark size={32} />
              <span className="font-bold text-slate-900 text-[17px] tracking-tight">
                State<span className="text-brand-600">Subsidies</span>
              </span>
            </a>

            <nav className="flex items-center gap-1">
              {[
                { href: "/", label: "Browse" },
                { href: "/map", label: "Map", sm: true },
                { href: "/saved", label: "Saved", sm: true },
              ].map(({ href, label, sm }) => (
                <a
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition-colors${sm ? " hidden sm:inline-flex" : ""}`}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
              <div>
                <p className="font-semibold text-slate-800 mb-2">StateSubsidies</p>
                <p className="text-sm text-slate-500">Helping businesses discover government incentives across all 50 states. Data sourced from official .gov and agency sites.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm mb-3">Top Categories</p>
                <ul className="space-y-1.5 text-sm text-slate-500">
                  {["EV Charging","Clean Technology","Manufacturing","Agriculture","Real Estate","Healthcare","Energy Storage","Construction"].map((c) => (
                    <li key={c}><a href={`/?industry=${encodeURIComponent(c)}`} className="hover:text-brand-600 transition-colors">{c}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm mb-3">Resources</p>
                <ul className="space-y-1.5 text-sm text-slate-500">
                  <li><a href="/" className="hover:text-brand-600 transition-colors">Browse All Programs</a></li>
                  <li><a href="/map" className="hover:text-brand-600 transition-colors">State Map</a></li>
                  <li><a href="/saved" className="hover:text-brand-600 transition-colors">Saved Programs</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-100 pt-6 space-y-2 text-xs text-slate-400">
              <p><strong className="text-slate-500">Disclaimer:</strong> StateSubsidies.com is an independent informational directory and is not affiliated with, endorsed by, or acting on behalf of any federal, state, or local government agency. All information is provided for general informational purposes only and does not constitute legal, financial, tax, or professional advice. Program details, eligibility requirements, funding amounts, and deadlines are subject to change without notice. Users should independently verify all information directly with the administering agency before making any business or financial decisions. Use of this site does not create any professional relationship between the user and StateSubsidies.com. StateSubsidies.com expressly disclaims all liability for any errors, omissions, or reliance on information contained herein.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
