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
          // --- Paleta derivada do logo Engemedical ---
          // Primary: ENGE Blue (#0698C2)
          "50": "#F2F9FC",
          "100": "#E6F5FA",
          "200": "#C5EAF5",
          "300": "#8DD8EE",
          "400": "#3BC0E3",
          "500": "#0698C2",
          "600": "#047A9E",
          "700": "#005C7A",
          "800": "#004560",
          "900": "#002E42",
          // Secondary: MEDICAL Green (#30D158)
          "green-100": "#E8F8ED",
          "green-200": "#C5F0D3",
          "green-300": "#7EE19E",
          "green-400": "#5EE17A",
          "green-500": "#30D158",
          "green-600": "#25A744",
          "green-700": "#1A7D33",
          // Accent: CONNECT Teal (#006B94)
          "teal-500": "#006B94",
          "teal-600": "#005777",
          "teal-100": "#E0F0F5",
          // Surfaces e neutros
          "surface": "#F9FAFB",
          "surface-raised": "#FFFFFF",
          "line": "#D1D5DB",
          "muted": "#919AA0",
          // Legacy aliases (mantêm compatibilidade com código existente)
          "primary": "#0698C2",
          "primary-hover": "#047A9E",
          "accent": "#0698C2",
          "accent-hover": "#005C7A",
          "tint": "#E6F5FA",
          "mist": "#F2F9FC",
          "focus": "#0698C2",
          "dark": "#005C7A",
          // Mantidos para compatibilidade com login cyberpunk
          "midnight": "#002E42",
          "deep": "#004560",
          "blue": "#0698C2",
          "cyan": "#0AABD4",
          "green": "#30D158",
          "lime": "#5EE17A",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

module.exports = config;
