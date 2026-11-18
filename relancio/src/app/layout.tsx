import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Relancio — Suivi et relance de devis", template: "%s · Relancio" },
  description:
    "Relancio aide les entreprises de climatisation, pompes à chaleur, plomberie et chauffage à suivre leurs devis et à relancer au bon moment.",
  applicationName: "Relancio",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#176B68",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
