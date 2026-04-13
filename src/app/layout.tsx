import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "البلاغ | قناة سياسية تونسية",
  description: "قناة البلاغ - منبر سياسي تونسي متخصص في الحوارات السياسية والفكرية مع شخصيات بارزة من وزراء وبرلمانيين ومفكرين وناشطين",
  keywords: ["البلاغ", "تونس", "سياسة", "مقابلات", "أخبار تونسية"],
  openGraph: {
    type: "website",
    locale: "ar_TN",
    url: "https://www.albaalaagh.com",
    siteName: "البلاغ",
    title: "البلاغ | قناة سياسية تونسية",
    description: "منبر سياسي تونسي متخصص في الحوارات السياسية والفكرية",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
