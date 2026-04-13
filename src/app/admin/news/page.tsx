"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/utils";
import type { NewsArticle } from "@/types";

const mockPending: NewsArticle[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  title: [
    "الحكومة التونسية تقر إجراءات تقشفية جديدة",
    "معارضون يرفضون الدستور الجديد ويطالبون بحوار وطني",
    "منظمة هيومن رايتس ووتش تنتقد الأوضاع الحقوقية في تونس",
    "صندوق النقد الدولي يعلق المفاوضات مع تونس",
    "تظاهرات في عدة مدن تونسية ضد السياسات الاقتصادية",
    "البرلمان الأوروبي يدعو إلى احترام الحريات في تونس",
    "اعتقال ناشط بارز إثر انتقاده للسياسات الحكومية",
    "تقرير: ارتفاع معدلات البطالة إلى مستويات قياسية",
  ][i],
  excerpt: "تفاصيل الخبر وسياقه السياسي والاقتصادي في تونس...",
  url: `https://example.com/news/${i + 1}`,
  source: ["الجزيرة", "موزاييك FM", "نواة", "بزنس نيوز", "العربي الجديد"][i % 5],
  image_url: i % 2 === 0 ? `https://picsum.photos/seed/${i + 30}/200/120` : undefined,
  published_at: new Date(Date.now() - i * 3600000).toISOString(),
  status: "pending",
  category: ["سياسة", "اقتصاد", "حقوق"][i % 3],
  created_at: new Date().toISOString(),
}));

export default function AdminNewsPage() {
  const [items, setItems] = useState(mockPending);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");

  const update = (id: string, status: NewsArticle["status"]) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, status } : n)));
    // TODO: supabaseAdmin.from('news').update({status}).eq('id', id)
  };

  const visible = items.filter((n) => n.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>قائمة الأخبار</h1>
        <button
          className="px-4 py-2 rounded-full text-sm font-bold border transition-all"
          style={{ borderColor: "#2E2A18", color: "#9A9070" }}
          onClick={() => {
            // TODO: trigger RSS fetch manually
            alert("جارٍ جلب الأخبار الجديدة...");
          }}
        >
          جلب أخبار جديدة ↺
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected"] as const).map((tab) => {
          const labels = { pending: "بانتظار الموافقة", approved: "موافق عليها", rejected: "مرفوضة" };
          const count = items.filter((n) => n.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
              style={{
                borderColor: filter === tab ? "#C9A844" : "#2E2A18",
                color: filter === tab ? "#C9A844" : "#9A9070",
                background: filter === tab ? "rgba(201,168,68,0.08)" : "transparent",
              }}
            >
              {labels[tab]} ({count})
            </button>
          );
        })}
      </div>

      {/* News list */}
      <div className="space-y-3">
        {visible.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: "#9A9070" }}>
            لا توجد أخبار في هذه الفئة
          </p>
        )}
        {visible.map((news) => (
          <div
            key={news.id}
            className="flex gap-4 p-4 rounded-xl"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            {news.image_url && (
              <img
                src={news.image_url}
                alt=""
                className="w-24 h-16 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
                >
                  {news.source}
                </span>
                {news.category && (
                  <span className="text-xs" style={{ color: "#9A9070" }}>{news.category}</span>
                )}
                <span className="text-xs mr-auto" style={{ color: "#9A9070" }}>
                  {timeAgo(news.published_at)}
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug" style={{ color: "#F0EAD6" }}>
                {news.title}
              </p>
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs mt-1 inline-block"
                style={{ color: "#9A9070" }}
              >
                المصدر الأصلي ↗
              </a>
            </div>
            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0">
              {news.status !== "approved" && (
                <button
                  onClick={() => update(news.id, "approved")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}
                >
                  نشر ✓
                </button>
              )}
              {news.status !== "rejected" && (
                <button
                  onClick={() => update(news.id, "rejected")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}
                >
                  رفض ✗
                </button>
              )}
              {news.status !== "pending" && (
                <button
                  onClick={() => update(news.id, "pending")}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}
                >
                  إعادة
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
