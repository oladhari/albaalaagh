"use client";

import { useState } from "react";
import NewsCard from "@/components/ui/NewsCard";

const CATEGORIES = ["الكل", "سياسة", "اقتصاد", "قضاء", "أمن", "مجتمع", "دولي", "ثقافة", "رياضة"];

const GEO_SECTIONS = [
  { key: "tunisia",       label: "أخبار تونس",         flag: "🇹🇳" },
  { key: "arab",          label: "أخبار العالم العربي", flag: "🌍" },
  { key: "international", label: "أخبار دولية",         flag: "🌐" },
  { key: "general",       label: "أخبار أخرى",          flag: "📰" },
];

export default function NewsGrid({ articles }: { articles: any[] }) {
  const [activeCategory, setActiveCategory] = useState("الكل");

  const filtered = activeCategory === "الكل"
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  const TUNISIA_SOURCES = ["تيوميديا", "موزاييك FM", "نواة"];
  const ARAB_SOURCES    = ["عربي21", "الجزيرة", "العربي الجديد", "القدس العربي"];

  function resolveGeo(article: any): string {
    // Use AI-assigned geo if available and not default
    if (article.geo && article.geo !== "general") return article.geo;
    // Fall back to source-based detection for older articles
    if (TUNISIA_SOURCES.includes(article.source)) return "tunisia";
    if (ARAB_SOURCES.includes(article.source))    return "arab";
    return "general";
  }

  // Group by geo
  const byGeo: Record<string, any[]> = { tunisia: [], arab: [], international: [], general: [] };
  for (const article of filtered) {
    const geo = resolveGeo(article);
    if (byGeo[geo]) byGeo[geo].push(article);
    else byGeo.general.push(article);
  }

  const visibleSections = GEO_SECTIONS.filter((s) => byGeo[s.key].length > 0);

  if (articles.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg mb-2" style={{ color: "#9A9070" }}>لا توجد أخبار منشورة بعد</p>
        <p className="text-sm" style={{ color: "#9A9070" }}>
          توجه إلى{" "}
          <a href="/admin/news" style={{ color: "#C9A844" }}>لوحة الإدارة</a>
          {" "}للموافقة على الأخبار
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Category filter ── */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
            style={{
              borderColor: activeCategory === cat ? "#C9A844" : "#2E2A18",
              color:       activeCategory === cat ? "#C9A844" : "#9A9070",
              background:  activeCategory === cat ? "rgba(201,168,68,0.08)" : "transparent",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: "#9A9070" }}>لا توجد أخبار في هذا التصنيف</p>
        </div>
      ) : (
        <div className="space-y-12">
          {visibleSections.map((section) => (
            <div key={section.key}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">{section.flag}</span>
                <h2 className="text-xl font-black" style={{ color: "#C9A844" }}>
                  {section.label}
                </h2>
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, #2E2A18, transparent)" }} />
                <span className="text-xs" style={{ color: "#9A9070" }}>
                  {byGeo[section.key].length} خبر
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {byGeo[section.key].map((article: any) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
