import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Script from "next/script";
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
    description: "منبر سياسي تونسي متخصص في الحوارات السياسية والفكرية مع شخصيات بارزة من وزراء وبرلمانيين ومفكرين وناشطين",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "البلاغ - منبر سياسي تونسي" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "البلاغ | قناة سياسية تونسية",
    description: "منبر سياسي تونسي متخصص في الحوارات السياسية والفكرية",
    images: ["/opengraph-image"],
  },
  other: {
    "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID ?? "",
  },
  alternates: {
    types: {
      "application/rss+xml": "https://www.albaalaagh.com/feed.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4198439711456588"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
