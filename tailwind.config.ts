import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary: deep navy/indigo — financial, trustworthy, premium
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#4f46e5",
          600: "#3730a3",
          700: "#312e81",
          800: "#1e1b6b",
          900: "#13104a",
          950: "#080630",
        },
        // Alias: forest kept for class-name compat, now maps to navy/indigo
        forest: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#4f46e5",
          600: "#3730a3",
          700: "#312e81",
          800: "#1e1b6b",
          900: "#13104a",
          950: "#080630",
        },
        // Accent: warm amber — used sparingly for highlights and logo dots
        amber: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#c4851a",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
          950: "#451a03",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
