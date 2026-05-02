import type { Metadata } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VIANOR — Maison de Viande | Personel Yönetim Sistemi",
  description:
    "Vianor Maison de Viande personel puantaj ve maaş yönetim paneli.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${playfair.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-cream-50 text-ink-900 antialiased min-h-screen">
        {children}
        <Toaster
          position="top-right"
          richColors
          theme="light"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #EDD9BC",
              color: "#2A1810",
              fontFamily: "var(--font-inter)",
            },
          }}
        />
      </body>
    </html>
  );
}
