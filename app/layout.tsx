import type { Metadata } from "next";
import { Work_Sans, Inter } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-work-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zitytraining",
  description: "Entrenamiento personal y pilates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${workSans.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}