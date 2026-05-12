import type { Config } from "tailwindcss";
import { navy as navyPalette, gold as goldPalette, red as redPalette } from "./lib/colors";

// Federal-navy + slate + restrained-red palette per StateSubsidies Design
// System (statesubsidies-design-system/colors_and_type.css). The legacy
// `brand`, `forest`, and `amber` namespaces are kept as aliases so existing
// className references continue to work with the new colors.
// Single source of truth: lib/colors.ts

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary federal navy (new)
        navy: navyPalette,
        // Aliases — keep legacy class names rendering with the new palette
        brand: navyPalette,
        forest: navyPalette,
        // Accent: parchment gold (new) — `New` chips and aged accents only
        gold: goldPalette,
        amber: goldPalette, // legacy alias
        // Federal red — flag bar, closing-soon, suspended, may-not-qualify
        red: redPalette,
      },
      fontFamily: {
        sans: ["Source Sans 3", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Charter", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Menlo", "Consolas", "monospace"],
        display: ["Source Serif 4", "Charter", "Georgia", "serif"],
      },
      boxShadow: {
        // Navy-tinted shadows per design spec — never pure black
        xs:    "0 1px 2px rgba(12, 23, 56, 0.06)",
        sm:    "0 1px 3px rgba(12, 23, 56, 0.07), 0 1px 2px rgba(12, 23, 56, 0.04)",
        md:    "0 4px 12px -2px rgba(12, 23, 56, 0.08), 0 2px 4px -2px rgba(12, 23, 56, 0.05)",
        lg:    "0 12px 28px -6px rgba(12, 23, 56, 0.14), 0 4px 8px -4px rgba(12, 23, 56, 0.06)",
        xl:    "0 24px 48px -12px rgba(12, 23, 56, 0.22)",
        "brand-glow": "0 8px 28px -4px rgba(44, 68, 103, 0.18), 0 2px 8px -2px rgba(12, 23, 56, 0.06)",
      },
      borderRadius: {
        // Strict scale: 4 chips, 6 inputs, 10 buttons, 14 cards, 20 modals
        sm:  "4px",
        md:  "6px",
        lg:  "10px",
        xl:  "14px",
        "2xl": "20px",
      },
    },
  },
  plugins: [],
};

export default config;
