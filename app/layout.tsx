import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geistMono, geistSans, sourceSerif } from "@/fonts";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Observatório Atlântico Vivo | Instituto Maré Aberta",
  description:
    "Uma expedição editorial por evidências históricas da onda de calor marinha de 2019 em Abrolhos.",
  icons: {
    icon: [{ url: "/identity/favicon.v1.svg", type: "image/svg+xml" }, { url: "/identity/favicon-32.v1.png", sizes: "32x32" }],
    apple: "/identity/apple-touch-icon.v1.png",
  },
  openGraph: { images: [{ url: "/identity/social.v1.png", width: 1200, height: 630, alt: "Mar aberto — Observatório Atlântico Vivo" }] },
};

// Cover extends into device safe areas; edge controls pad themselves with env() insets.
// Zoom stays unrestricted for magnification.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
