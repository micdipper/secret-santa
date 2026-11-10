import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { AscoltaTocchi } from "@/components/audio";

// Titoli: Basteleur Bold (Velvetyne, licenza SIL OFL in app/fonts/Basteleur-OFL.txt)
const basteleur = localFont({
  src: "./fonts/Basteleur-Bold.woff2",
  weight: "700",
  variable: "--font-basteleur",
});

// Testo: Bricolage Grotesque (Google Fonts, servito dal nostro dominio)
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: "Secret Santa",
  description: "Il Secret Santa tra amici, con la bacheca di ognuno.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2f4830",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${basteleur.variable} ${bricolage.variable} antialiased`}>
      <body className="min-h-dvh flex flex-col">
        <AscoltaTocchi />
        {children}
      </body>
    </html>
  );
}
