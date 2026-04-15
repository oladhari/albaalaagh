"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/utils";
import type { WriterArticle } from "@/types";

type Tab = "pending" | "approved" | "rejected";

export default function AdminWriterArticlesPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [articles, setArticles] = useState<WriterArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/writer-articles?status=${t}`, { credentials: "include" });
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  const update = async (id: string, status: "approved" | "rejected") => {
    setProcessing(id);
    await fetch("/api/admin/writer-articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, status }),
    });
    setArticles((prev) => prev.filter((a) => a.id !== id));
    setProcessing(null);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending",  label: "قيد المراجعة" },
    { key: "approved", label: "معتمدة" },
    { key: "rejected", label: "مرفوضة" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>مقالات الكتّاب</h1>
        <button
          onClick={() => load(tab)}
          className="px-4 py-2 rounded-full text-xs font-bold border"
          style={{ borderColor: "#2E2A18", color: "#9A9070" }}
        >
          تحديث ↻
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-full text-sm font-medium border transition-all"
            style={{
              borderColor: tab === t.key ? "#C9A844" : "#2E2A18",
              color: tab === t.key ? "#C9A844" : "#9A9070",
              background: tab === t.key ? "rgba(201,168,68,0.08)" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Info banner */}
      {tab === "pending" && (
        <div
          className="mb-5 p-3 rounded-lg text-xs"
          style={{ background: "rgba(201,168,68,0.08)", border: "1px solid rgba(201,168,68,0.2)", color: "#C9A844" }}
        >
          المقالات هنا جُلبت تلقائياً من جوجل نيوز. اعتمد ما يبدو مقالاً للكاتب واحذف الأخبار عنه.
        </div>
      )}

      {loading ? (
        <div className="text-center py-10" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-10" style={{ color: "#9A9070" }}>لا توجد مقالات في هذه الخانة</div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="p-4 rounded-xl flex gap-4"
              style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
                  >
                    {article.writer_name}
                  </span>
                  {article.source && (
                    <span className="text-xs" style={{ color: "#9A9070" }}>{article.source}</span>
                  )}
                  <span className="text-xs mr-auto" style={{ color: "#9A9070" }}>
                    {timeAgo(article.published_at)}
                  </span>
                </div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sm leading-snug line-clamp-2 hover:text-[#C9A844] transition-colors"
                  style={{ color: "#F0EAD6" }}
                >
                  {article.title} ↗
                </a>
                {article.excerpt && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "#9A9070" }}>
                    {article.excerpt}
                  </p>
                )}
              </div>

              {tab === "pending" && (
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => update(article.id, "approved")}
                    disabled={processing === article.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}
                  >
                    اعتماد
                  </button>
                  <button
                    onClick={() => update(article.id, "rejected")}
                    disabled={processing === article.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}
                  >
                    حذف
                  </button>
                </div>
              )}

              {tab === "approved" && (
                <button
                  onClick={() => update(article.id, "rejected")}
                  disabled={processing === article.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 self-start"
                  style={{ background: "rgba(255,107,107,0.15)", color: "#FF6B6B" }}
                >
                  إلغاء
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
