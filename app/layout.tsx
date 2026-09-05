import type { Metadata } from "next";
import "./globals.css";
import { geistMono, geistSans } from "@/fonts";

export const metadata: Metadata = {
  title: "Mar aberto — estudo de navegação",
  description:
    "Protótipo descartável da expedição do Observatório Atlântico Vivo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
