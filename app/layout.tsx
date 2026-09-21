import type { Metadata, Viewport } from "next";
import "./globals.css";
import { geistMono, manrope } from "@/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Travessia | Uma viagem pela costa brasileira",
  description:
    "Uma viagem fictícia de Fernando de Noronha a Ilha Grande, a bordo do Del Mar, pelas ilhas, pela vida marinha e pelas temporadas reais da costa brasileira.",
  icons: {
    icon: [
      { url: "/identity/favicon.v1.svg", type: "image/svg+xml" },
      { url: "/identity/favicon-32.v1.png", sizes: "32x32" },
    ],
    apple: "/identity/apple-touch-icon.v1.png",
  },
  openGraph: {
    images: [
      {
        url: "/identity/social.v1.png",
        width: 1200,
        height: 630,
        alt: "Travessia — uma viagem pela costa brasileira",
      },
    ],
  },
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
      className={cn("h-full", "antialiased", "font-sans", manrope.variable, geistMono.variable)}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
