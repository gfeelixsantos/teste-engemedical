import localFont from "next/font/local";

export const fontSans = localFont({
  src: [
    { path: "./fonts/Inter-latin-ext.woff2", weight: "100 900" },
    { path: "./fonts/Inter-latin.woff2", weight: "100 900" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const fontMono = localFont({
  src: [
    { path: "./fonts/FiraCode-latin-ext.woff2", weight: "400 700" },
    { path: "./fonts/FiraCode-latin.woff2", weight: "400 700" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const fontDisplay = localFont({
  src: [
    { path: "./fonts/PlusJakartaSans-latin-ext-500.woff2", weight: "500" },
    { path: "./fonts/PlusJakartaSans-latin-500.woff2", weight: "500" },
    { path: "./fonts/PlusJakartaSans-latin-ext-600.woff2", weight: "600" },
    { path: "./fonts/PlusJakartaSans-latin-600.woff2", weight: "600" },
    { path: "./fonts/PlusJakartaSans-latin-ext-700.woff2", weight: "700" },
    { path: "./fonts/PlusJakartaSans-latin-700.woff2", weight: "700" },
    { path: "./fonts/PlusJakartaSans-latin-ext-800.woff2", weight: "800" },
    { path: "./fonts/PlusJakartaSans-latin-800.woff2", weight: "800" },
  ],
  variable: "--font-display",
  display: "swap",
});
