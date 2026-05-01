import type { Config } from "tailwindcss";

// Federal-navy + slate + restrained-red palette per StateSubsidies Design
// System (statesubsidies-design-system/colors_and_type.css). The legacy
// `brand`, `forest`, and `amber` namespaces are kept as aliases so existing
// className references continue to work with the new colors.

const navyPalette = {
  50:  "#f1f4f9",
  100: "#dbe2ee",
  200: "#b6c5db",
  300: "#8aa1c1",
  400: "#5d7ba3",
  500: "#3d5a85",
  600: "#2c4467", // primary brand
  700: "#1f3257",
  800: "#15244a", // hero / deep
  900: "#0c1738",
  950: "#060c22",
};

const goldPalette = {
  50:  "#fbf6e9",
  100: "#f5ead0",
  200: "#ecd9a1",
  300: "#e0c272",
  400: "#caa84e",
  500: "#b8893d", // aged parchment gold
  600: "#8f6a2d",
  700: "#6b4e1f",
  800: "#4f3a17",
  900: "#332610",
  950: "#1f1709",
};

const redPalette = {
  50:  "#fef2f2",
  100: "#fde3e3",
  200: "#facaca",
  300: "#f4a3a3",
  400: "#e57272",
  500: "#c0392b",
  600: "#a8312a", // federal-flag red
  700: "#8b2722",
  800: "#6e1f1c",
  900: "#4d1612",
  950: "#2a0d0a",
};

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
