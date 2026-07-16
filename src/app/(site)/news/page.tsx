import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import SectionHeader from "@/components/ui/SectionHeader";
import NewsGrid from "./NewsGrid";

export const metadata = {
  title: "أخبار البلاغ | البلاغ",
  description: "أخبار تونس والعالم العربي من تحرير البلاغ",
};

export const revalidate = 120;

const PAGE_SIZE = 24;
const CUTOFF_DAYS = 4;

export const GEO_META: Record<string, { label: string; flag: string }> = {
  tunisia:       { label: "أخبار تونس",          flag: "🇹🇳" },
  arab:          { label: "أخبار العالم العربي",  flag: "🌍" },
  international: { label: "أخبار دولية",          flag: "🌐" },
  general:       { label: "أخبار أخرى",           flag: "📰" },
};

async function getDefaultData() {
  const cutoff = new Date(Date.now() - CUTOFF_DAYS * 86_400_000).toISOString();

  const [{ data: recent }, { data: allGeos }] = await Promise.all([
    supabaseAdmin
      .from("news")
      .select("*")
      .eq("source", "البلاغ")
      .eq("status", "approved")
      .gte("published_at", cutoff)
      .order("published_at", { ascending: false }),

    // Lightweight: only fetch geo column to compute totals
    supabaseAdmin
      .from("news")
      .select("geo")
      .eq("source", "البلاغ")
      .eq("status", "approved"),
  ]);

  const totalByGeo: Record<string, number> = {};
  for (const r of allGeos ?? []) {
    const g = r.geo ?? "general";
    totalByGeo[g] = (totalByGeo[g] ?? 0) + 1;
  }

  return { mode: "default" as const, articles: recent ?? [], totalByGeo };
}

async function getGeoData(geo: string, page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await supabaseAdmin
    .from("news")
    .select("*", { count: "exact" })
    .eq("source", "البلاغ")
    .eq("status", "approved")
    .eq("geo", geo)
    .order("published_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  return {
    mode: "geo" as const,
    geo,
    articles: data ?? [],
    totalCount: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
  };
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ geo?: string; page?: string }>;
}) {
  const params  = await searchParams;
  const geo     = params.geo && GEO_META[params.geo] ? params.geo : null;
  const page    = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const data    = geo ? await getGeoData(geo, page) : await getDefaultData();
  const geoMeta = geo ? GEO_META[geo] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">
      {geo ? (
        <>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 text-sm mb-6 transition-colors hover:opacity-80"
            style={{ color: "#9A9070" }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M10 19l-7-7 7-7v4h11v6H10v4z"/></svg>
            كل الأخبار
          </Link>
          <SectionHeader
            title={`${geoMeta!.flag} ${geoMeta!.label}`}
            subtitle={data.mode === "geo" ? `${data.totalCount} خبر — الصفحة ${page} من ${data.totalPages}` : ""}
          />
        </>
      ) : (
        <SectionHeader
          title="أخبار البلاغ"
          subtitle={`آخر ${CUTOFF_DAYS} أيام — أخبار تونس والعالم العربي`}
        />
      )}

      <NewsGrid {...data} cutoffDays={CUTOFF_DAYS} />
    </div>
  );
}
