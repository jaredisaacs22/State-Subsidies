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
        // Primary: deep forest green — consistent with logo and map
        brand: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22a85a",
          600: "#1a7a42",
          700: "#1a5c38",
          800: "#14432a",
          900: "#0d2e1c",
          950: "#071a10",
        },
        // Alias: forest mirrors brand for semantic clarity
        forest: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22a85a",
          600: "#1a7a42",
          700: "#1a5c38",
          800: "#14432a",
          900: "#0d2e1c",
          950: "#071a10",
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
