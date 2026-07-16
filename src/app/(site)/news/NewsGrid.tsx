"use client";

import { useState } from "react";
import Link from "next/link";
import NewsCard from "@/components/ui/NewsCard";
import { GEO_META } from "./page";

const CATEGORIES = ["الكل", "سياسة", "اقتصاد", "مجتمع", "قضاء", "أمن", "ثقافة", "رياضة", "بيئة", "صحة", "تعليم", "عام"];

const GEO_ORDER = ["tunisia", "arab", "international", "general"] as const;

type DefaultProps = {
  mode: "default";
  articles: any[];
  totalByGeo: Record<string, number>;
  cutoffDays: number;
};

type GeoProps = {
  mode: "geo";
  geo: string;
  articles: any[];
  totalCount: number;
  page: number;
  totalPages: number;
  cutoffDays: number;
};

type Props = DefaultProps | GeoProps;

function CategoryFilter({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {CATEGORIES.map(cat => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
          style={{
            borderColor: active === cat ? "#C9A844" : "#2E2A18",
            color:       active === cat ? "#C9A844" : "#9A9070",
            background:  active === cat ? "rgba(201,168,68,0.08)" : "transparent",
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, geo }: { page: number; totalPages: number; geo: string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2);

  return (
    <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
      {page > 1 && (
        <Link href={`/news?geo=${geo}&page=${page - 1}`} className="px-4 py-2 rounded-lg text-sm border transition-all hover:opacity-80" style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
          السابق
        </Link>
      )}
      {visible.map((p, i) => {
        const prev = visible[i - 1];
        return (
          <span key={p} className="flex items-center gap-2">
            {prev && p - prev > 1 && <span style={{ color: "#9A9070" }}>…</span>}
            <Link
              href={`/news?geo=${geo}&page=${p}`}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold border transition-all"
              style={{
                borderColor: p === page ? "#C9A844" : "#2E2A18",
                color:       p === page ? "#C9A844" : "#9A9070",
                background:  p === page ? "rgba(201,168,68,0.08)" : "transparent",
              }}
            >
              {p}
            </Link>
          </span>
        );
      })}
      {page < totalPages && (
        <Link href={`/news?geo=${geo}&page=${page + 1}`} className="px-4 py-2 rounded-lg text-sm border transition-all hover:opacity-80" style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
          التالي
        </Link>
      )}
    </div>
  );
}

function DefaultView({ articles, totalByGeo, cutoffDays }: DefaultProps) {
  const [cat, setCat] = useState("الكل");

  const filtered = cat === "الكل" ? articles : articles.filter(a => a.category === cat);

  const byGeo: Record<string, any[]> = { tunisia: [], arab: [], international: [], general: [] };
  for (const a of filtered) {
    const g = a.geo ?? "general";
    (byGeo[g] ?? byGeo.general).push(a);
  }

  const visibleSections = GEO_ORDER.filter(g => byGeo[g].length > 0 || (totalByGeo[g] ?? 0) > 0);

  if (articles.length === 0) {
    return <div className="text-center py-20" style={{ color: "#9A9070" }}>لا توجد أخبار منشورة بعد</div>;
  }

  return (
    <div>
      <CategoryFilter active={cat} onChange={setCat} />

      {visibleSections.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#9A9070" }}>لا توجد أخبار في هذا التصنيف</div>
      ) : (
        <div className="space-y-12">
          {visibleSections.map(geoKey => {
            const meta        = GEO_META[geoKey];
            const items       = byGeo[geoKey];
            const totalForGeo = totalByGeo[geoKey] ?? 0;
            const olderCount  = totalForGeo - (byGeo[geoKey]?.length ?? 0);

            return (
              <div key={geoKey}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-lg">{meta.flag}</span>
                  <h2 className="text-xl font-black" style={{ color: "#C9A844" }}>{meta.label}</h2>
                  <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #2E2A18, transparent)" }} />
                  <span className="text-xs" style={{ color: "#9A9070" }}>
                    {items.length} خبر — آخر {cutoffDays} أيام
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: "#9A9070" }}>لا توجد أخبار حديثة في هذا القسم</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((a: any) => <NewsCard key={a.id} article={a} />)}
                  </div>
                )}

                {/* More button */}
                {totalForGeo > 0 && (
                  <div className="mt-5 flex items-center justify-between">
                    {olderCount > 0 && (
                      <p className="text-sm" style={{ color: "#9A9070" }}>
                        و <span style={{ color: "#C9A844" }}>{olderCount}</span> خبراً في الأرشيف
                      </p>
                    )}
                    <Link
                      href={`/news?geo=${geoKey}`}
                      className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all hover:opacity-80"
                      style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
                    >
                      عرض جميع {meta.label}
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current rotate-180"><path d="M10 19l-7-7 7-7v4h11v6H10v4z"/></svg>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GeoView({ geo, articles, page, totalPages }: GeoProps) {
  const [cat, setCat] = useState("الكل");

  const filtered = cat === "الكل" ? articles : articles.filter(a => a.category === cat);

  return (
    <div>
      <CategoryFilter active={cat} onChange={setCat} />

      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#9A9070" }}>لا توجد أخبار في هذا التصنيف</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a: any) => <NewsCard key={a.id} article={a} />)}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} geo={geo} />
    </div>
  );
}

export default function NewsGrid(props: Props) {
  if (props.mode === "geo") return <GeoView {...props} />;
  return <DefaultView {...props} />;
}
