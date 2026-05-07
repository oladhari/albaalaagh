import { Metadata } from "next";

export const metadata: Metadata = {
  title: "تواصل معنا | البلاغ",
  description: "تواصل مع فريق قناة البلاغ — للاستفسارات والمقترحات والمشاركة في البرامج",
  openGraph: {
    title: "تواصل معنا | البلاغ",
    description: "تواصل مع فريق قناة البلاغ — للاستفسارات والمقترحات والمشاركة في البرامج",
    url: "https://www.albaalaagh.com/contact",
    siteName: "البلاغ",
    locale: "ar_TN",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
