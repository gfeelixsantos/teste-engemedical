const { heroui } = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        brand: {
          midnight: "#06172F",
          deep: "#082A4C",
          blue: "#006DFF",
          cyan: "#16D9F5",
          green: "#19E85A",
          lime: "#8BFF33",
          surface: "#F6FAFC",
          line: "#D8E7EF",
          primary: "#104e35",
          "primary-hover": "#7FA830",
          accent: "#44735E",
          "accent-hover": "#B8D864",
          tint: "#e8f4e3",
          mist: "#f5f9f7",
          focus: "#3dbdb9",
          dark: "#0d3d29",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

module.exports = config;
