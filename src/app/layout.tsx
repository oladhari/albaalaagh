import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { headers } from "next/headers";
import CookieBanner from "@/components/ui/CookieBanner";
import GoogleAnalytics from "@/components/ui/GoogleAnalytics";
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
  keywords: [
    // Arabic
    "البلاغ", "albaalaagh", "تونس", "سياسة تونسية", "أخبار تونس",
    "مقابلات سياسية", "حوارات سياسية", "برلمان تونس", "وزراء تونس",
    "ناشطون تونسيون", "مفكرون", "إعلام تونسي", "تحليل سياسي",
    "قضايا شرعية", "الشأن التونسي", "أخبار عربية",
    // French
    "actualité tunisienne", "politique tunisienne", "Tunisie", "Al Balaagh",
    "interviews politiques", "analyse politique Tunisie", "médias tunisiens",
    "parlement tunisien", "actualité arabe", "débat politique",
    // English
    "Tunisia news", "Tunisian politics", "Tunisia current affairs",
    "political interviews Tunisia", "Tunisian media", "Arabic news Tunisia",
    "Tunisia analysis", "North Africa news",
    // Name spelling variants (Arabic → Latin transliterations)
    "البلاغ", "albalagh", "albalaagh", "albaalaagh", "al balagh", "al-balagh",
    "al-balaagh", "al-baalaagh", "Al Balagh", "Al Balaagh", "Al Baalaagh",
    "AlBalagh", "AlBalaagh", "AlBaalaagh",
  ],
  authors: [{ name: "البلاغ", url: "https://www.albaalaagh.com" }],
  creator: "البلاغ",
  publisher: "البلاغ",
  metadataBase: new URL("https://www.albaalaagh.com"),
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ar_TN",
    url: "https://www.albaalaagh.com",
    siteName: "البلاغ",
    title: "البلاغ | قناة سياسية تونسية",
    description: "منبر سياسي تونسي متخصص في الحوارات السياسية والفكرية مع شخصيات بارزة من وزراء وبرلمانيين ومفكرين وناشطين",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "البلاغ - منبر سياسي تونسي" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "البلاغ | قناة سياسية تونسية",
    description: "منبر سياسي تونسي متخصص في الحوارات السياسية والفكرية",
    images: ["/og-image.png"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.albaalaagh.com/#organization",
        name: "البلاغ",
        alternateName: "Albaalaagh",
        url: "https://www.albaalaagh.com",
        logo: "https://www.albaalaagh.com/albaalaagh-logo.png",
        email: "contact@albaalaagh.com",
      },
      {
        "@type": "WebSite",
        "@id": "https://www.albaalaagh.com/#website",
        url: "https://www.albaalaagh.com",
        name: "البلاغ",
        inLanguage: "ar-TN",
        publisher: { "@id": "https://www.albaalaagh.com/#organization" },
      },
    ],
  };

  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
        <GoogleAnalytics nonce={nonce} />
        <CookieBanner />
      </body>
    </html>
  );
}
