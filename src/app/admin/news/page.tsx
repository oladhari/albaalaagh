"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo } from "@/lib/utils";
import type { NewsArticle } from "@/types";

type Filter = "pending" | "approved" | "rejected" | "priority";

export default function AdminNewsPage() {
  const [items, setItems]       = useState<NewsArticle[]>([]);
  const [filter, setFilter]     = useState<Filter>("pending");
  const [loading, setLoading]   = useState(true);
  const [working, setWorking]   = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated]   = useState<Record<string, { url: string; title: string }>>({});

  const load = useCallback(async (status: Filter) => {
    setLoading(true);
    const apiStatus = status === "priority" ? "pending" : status;
    const res  = await fetch(`/api/admin/news?status=${apiStatus}`, { credentials: "include" });
    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    setItems(status === "priority" ? items.filter((n: any) => (n.priority_score ?? 0) >= 5) : items);
    setLoading(false);
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  const update = async (id: string, status: NewsArticle["status"]) => {
    setWorking(id);
    await fetch("/api/admin/news", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, status }),
    });
    // Remove from current list after action
    setItems((prev) => prev.filter((n) => n.id !== id));
    setWorking(null);
  };

  const generate = async (id: string) => {
    setGenerating(id);
    try {
      const res  = await fetch(`/api/admin/news/${id}/generate`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "خطأ في الإنشاء"); return; }
      setGenerated((prev) => ({ ...prev, [id]: { url: data.url, title: data.title } }));
    } finally {
      setGenerating(null);
    }
  };

  const fetchFresh = async () => {
    setLoading(true);
    await fetch("/api/cron/fetch-news");
    await load(filter);
  };

  const LABELS: Record<Filter, string> = {
    priority: "⭐ أولوية",
    pending:  "بانتظار الموافقة",
    approved: "موافق عليها",
    rejected: "مرفوضة",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>قائمة الأخبار</h1>
        <button
          onClick={fetchFresh}
          disabled={loading}
          className="px-4 py-2 rounded-full text-sm font-bold border transition-all"
          style={{ borderColor: "#2E2A18", color: "#9A9070" }}
        >
          {loading ? "جارٍ التحميل..." : "جلب أخبار جديدة ↺"}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["priority", "pending", "approved", "rejected"] as Filter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
            style={{
              borderColor: filter === tab ? "#C9A844" : "#2E2A18",
              color:       filter === tab ? "#C9A844" : "#9A9070",
              background:  filter === tab ? "rgba(201,168,68,0.08)" : "transparent",
            }}
          >
            {LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Info banner for pending */}
      {filter === "pending" && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-xs"
          style={{ background: "rgba(201,168,68,0.06)", border: "1px solid #2E2A18", color: "#9A9070" }}
        >
          عند الضغط على <span style={{ color: "#6BCB77" }}>نشر</span>، يُعاد تحرير الخبر تلقائياً بأسلوب البلاغ قبل نشره.
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "#9A9070" }}>جارٍ التحميل...</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "#9A9070" }}>
              {filter === "pending" ? "لا توجد أخبار جديدة — اضغط «جلب أخبار جديدة» أعلاه" : "لا توجد عناصر في هذه الفئة"}
            </p>
          </div>
        )}

        {items.map((news) => {
          const priority = (news as any).priority_score ?? 0;
          const isUrgent = priority >= 8;
          const isHigh   = priority >= 5 && priority < 8;
          return (
          <div
            key={news.id}
            className="flex gap-4 p-4 rounded-xl"
            style={{
              background:  isUrgent ? "rgba(255,107,107,0.06)" : isHigh ? "rgba(201,168,68,0.06)" : "#1A1810",
              border:      isUrgent ? "1px solid rgba(255,107,107,0.3)" : isHigh ? "1px solid rgba(201,168,68,0.25)" : "1px solid #2E2A18",
              opacity:     working === news.id ? 0.5 : 1,
              transition:  "opacity 0.2s",
            }}
          >
            {/* Image */}
            {news.image_url && (
              <img
                src={news.image_url}
                alt=""
                className="w-24 h-16 rounded-lg object-cover shrink-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {isUrgent && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,107,107,0.2)", color: "#FF6B6B" }}>
                    ⭐⭐ عاجل
                  </span>
                )}
                {isHigh && !isUrgent && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(201,168,68,0.2)", color: "#C9A844" }}>
                    ⭐ أولوية
                  </span>
                )}
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
              <p className="text-sm font-semibold leading-snug mb-1" style={{ color: "#F0EAD6" }}>
                {news.title}
              </p>
              {news.excerpt && (
                <p className="text-xs line-clamp-2 mb-1" style={{ color: "#9A9070" }}>
                  {news.excerpt}
                </p>
              )}
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
                style={{ color: "#9A9070" }}
              >
                المصدر الأصلي ↗
              </a>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0 justify-center">
              {filter !== "approved" && (
                <button
                  onClick={() => update(news.id, "approved")}
                  disabled={working === news.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}
                >
                  {working === news.id ? "..." : "نشر ✓"}
                </button>
              )}
              {filter !== "rejected" && (
                <button
                  onClick={() => update(news.id, "rejected")}
                  disabled={working === news.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}
                >
                  رفض ✗
                </button>
              )}
              {filter !== "pending" && (
                <button
                  onClick={() => update(news.id, "pending")}
                  disabled={working === news.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}
                >
                  إعادة
                </button>
              )}

              {/* Generate article + post to Facebook */}
              {generated[news.id] ? (
                <a
                  href={generated[news.id].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-center"
                  style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844", textDecoration: "none" }}
                >
                  ✓ عرض التقرير ↗
                </a>
              ) : (
                <button
                  onClick={() => generate(news.id)}
                  disabled={generating === news.id || working === news.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: "rgba(201,168,68,0.08)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
                >
                  {generating === news.id ? "⏳ جارٍ..." : "✍️ تقرير"}
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
