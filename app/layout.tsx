import type { Metadata, Viewport } from "next";
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
  // Necesario para que la imagen de openGraph salga con URL absoluta: sin
  // ella WhatsApp/iMessage no la encuentran y enseñan un icono genérico.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://zitytraining-web-6tkjf.ondigitalocean.app"),
  title: "Zitytraining",
  description: "Entrenamiento personal y pilates",
  openGraph: {
    title: "Zitytraining",
    description: "Entrenamiento personal y pilates",
    siteName: "Zitytraining",
    locale: "es_ES",
    type: "website",
    images: [{ url: "/og-image.png", width: 512, height: 512, alt: "Zitytraining" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zitytraining",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6aa842",
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