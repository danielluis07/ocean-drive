import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geistMono, geistSans } from "@/fonts";

export const metadata: Metadata = {
  title: "Observatório Atlântico Vivo | Instituto Maré Aberta",
  description:
    "Uma expedição editorial por evidências históricas da onda de calor marinha de 2019 em Abrolhos.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
