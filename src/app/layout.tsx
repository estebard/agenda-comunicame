import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Centro Comunícame - ERP",
  description: "Gestión algorítmica y operativa de terapias",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100 flex min-h-screen`}>
        {/* Inyectamos el menú lateral */}
        <Sidebar />
        
        {/* Contenedor principal para el contenido de las páginas */}
        <div className="flex-1 overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}