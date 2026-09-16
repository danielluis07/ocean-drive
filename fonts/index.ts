import localFont from "next/font/local";

export const geistSans = localFont({
  src: "./geist-400-latin.v1.woff2",
  weight: "400 600",
  display: "swap",
  variable: "--font-geist-sans",
  fallback: ["Arial", "sans-serif"],
});

export const geistMono = localFont({
  src: "./geistmono-500-latin.v1.woff2",
  weight: "500",
  display: "swap",
  variable: "--font-geist-mono",
  fallback: ["Courier New", "monospace"],
});

export const sourceSerif = localFont({
  src: "./sourceserif4-400-latin.v1.woff2",
  weight: "400",
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-source-serif",
  fallback: ["Georgia", "serif"],
});
