import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/services/locale-provider";
import Navbar from "./components/Navbar";

const dmSans = DM_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HealthCore",
  description: "Panel de gestión y análisis de incidencias de pacientes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface-muted text-text-primary font-body">
        <LocaleProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
