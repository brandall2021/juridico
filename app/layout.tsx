import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Expedientes Jurídicos",
  description: "Consulta y carga de expedientes judiciales",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={inter.variable} style={{ fontFamily: "var(--font-sans)" }}>
        {children}
      </body>
    </html>
  );
}