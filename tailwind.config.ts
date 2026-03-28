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
        // Primary: deep navy — professional, patriotic without being loud
        brand: {
          50:  "#eef4ff",
          100: "#d9e8ff",
          200: "#bcd4fe",
          300: "#8eb5fc",
          400: "#5a8cf8",
          500: "#3568f0",
          600: "#2249e3",
          700: "#1a37c8",
          800: "#1c2fa3",
          900: "#0d2052",  // deep navy — primary identity color
          950: "#08153a",
        },
        // Secondary: forest green — nature, growth, resources
        forest: {
          50:  "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22a85a",
          600: "#1a7a42",
          700: "#1a5c38",  // primary forest green
          800: "#14432a",
          900: "#0d2e1c",
          950: "#071a10",
        },
        // Accent: warm amber — the sun in the logo, used sparingly
        amber: {
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#c4851a",  // warm amber — sparingly for highlights
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
