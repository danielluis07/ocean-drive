import localFont from "next/font/local";

export const manrope = localFont({
  src: "./manrope-400-800-latin.v1.woff2",
  weight: "400 800",
  display: "swap",
  variable: "--font-manrope",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
});

export const geistMono = localFont({
  src: "./geistmono-500-latin.v1.woff2",
  weight: "500",
  display: "swap",
  variable: "--font-geist-mono",
  fallback: ["Courier New", "monospace"],
});
