import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { REPORT_CATEGORIES } from "@/lib/reports";
import ReportBody from "@/components/reports/ReportBody";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> };
const getReport = cache(async (slug: string, preview: boolean) => {
  const authorized = preview && (await cookies()).get("admin_authed")?.value === "1";
  let query = supabaseAdmin.from("articles").select("id,slug,title,excerpt,content,cover_image,category,published_at,published,status").eq("slug", slug).in("category", [...REPORT_CATEGORIES]);
  if (!authorized) query = query.eq("published", true).eq("status", "published");
  const { data, error } = await query.single();
  if (error || !data) return null;
  return { report: data, preview: Boolean(authorized) };
});
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getReport(slug, (await searchParams).preview === "1");
  if (!result) return { title: "تقرير غير متاح", robots: { index: false, follow: false } };
  const { report, preview } = result;
  if (preview) return { title: `معاينة مسودة | ${report.title}`, robots: { index: false, follow: false }, openGraph: { images: [] } };
  const url = `https://www.albaalaagh.com/reports/${slug}`;
  const images = report.cover_image ? [{ url: report.cover_image, width: 1280, height: 720, alt: report.title }] : [];
  return {
    title: `${report.title} | البلاغ`, description: report.excerpt,
    authors: [{ name: "قناة البلاغ الرقمية" }], alternates: { canonical: url },
    openGraph: { title: report.title, description: report.excerpt, url, type: "article", locale: "ar_TN", siteName: "البلاغ", images, authors: ["قناة البلاغ الرقمية"], ...(report.published_at ? { publishedTime: report.published_at } : {}) },
    twitter: { card: "summary_large_image", title: report.title, description: report.excerpt, images },
    other: { "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID ?? "", "article:author": "قناة البلاغ الرقمية" },
  };
}
export default async function ReportPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const result = await getReport(slug, (await searchParams).preview === "1");
  if (!result) notFound();
  const { report, preview } = result;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: report.title, description: report.excerpt, image: report.cover_image, datePublished: report.published_at, author: { "@type": "Organization", name: "قناة البلاغ الرقمية" }, publisher: { "@type": "Organization", name: "قناة البلاغ الرقمية" }, mainEntityOfPage: `https://www.albaalaagh.com/reports/${slug}` };
  return <>{!preview && <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}<ReportBody report={report} preview={preview} /></>;
}
