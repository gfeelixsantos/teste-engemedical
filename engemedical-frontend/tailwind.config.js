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
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        brand: {
          // --- Paleta derivada do logo Engemedical ---
          // Paleta oficial alinhada ao ícone Engemedical
          "50": "#EFFBFD",
          "100": "#D9F5FA",
          "200": "#B4EAF2",
          "300": "#78D6E4",
          "400": "#44C2D5",
          "500": "#28B1CF",
          "600": "#148FAE",
          "700": "#006782",
          "800": "#00506A",
          "900": "#043B4B",
          "green-100": "#E8FFF0",
          "green-200": "#BFF8D2",
          "green-300": "#75E99A",
          "green-400": "#3FE17B",
          "green-500": "#00C853",
          "green-600": "#0BA942",
          "green-700": "#0B9516",
          "teal-500": "#006782",
          "teal-600": "#00506A",
          "teal-100": "#D9F5FA",
          // Surfaces e neutros
          "surface": "#F2F9FB",
          "surface-raised": "#FFFFFF",
          "line": "#D6E8EE",
          "muted": "#6B8490",
          "navy": "#04151F",
          "teal": "#006782",
          "cyan": "#28B1CF",
          // Legacy aliases (mantêm compatibilidade com código existente)
          "primary": "#28B1CF",
          "primary-hover": "#148FAE",
          "accent": "#28B1CF",
          "accent-hover": "#006782",
          "tint": "#D9F5FA",
          "mist": "#EFFBFD",
          "focus": "#28B1CF",
          "dark": "#006782",
          "midnight": "#04151F",
          "deep": "#082532",
          "blue": "#28B1CF",
          "cyan": "#44C2D5",
          "green": "#00C853",
          "lime": "#73DC84",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};

module.exports = config;
