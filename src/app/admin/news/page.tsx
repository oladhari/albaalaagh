"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo } from "@/lib/utils";
import type { NewsArticle } from "@/types";

type Filter = "pending" | "approved" | "rejected" | "priority";

interface Preview {
  newsId:       string;
  title:        string;
  excerpt:      string;
  content:      string;
  image_url:    string | null;
  geo:          string;
  category:     string;
  published_at: string;
  editMode?:    boolean; // true = editing existing, false = new publish
}

const GOLD  = "#C9A844";
const DIM   = "#9A9070";
const GREEN = "#6BCB77";
const RED   = "#FF6B6B";
const inputStyle = {
  background: "#111008",
  border: "1px solid #2E2A18",
  color: "#F0EAD6",
  borderRadius: 8,
  padding: "8px 12px",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  fontSize: 13,
  resize: "vertical" as const,
};

export default function AdminNewsPage() {
  const [items, setItems]         = useState<NewsArticle[]>([]);
  const [filter, setFilter]       = useState<Filter>("pending");
  const [loading, setLoading]     = useState(true);
  const [working, setWorking]     = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [preview, setPreview]     = useState<Preview | null>(null);
  const [publishing, setPublishing]   = useState(false);
  const [published, setPublished]     = useState<Record<string, string>>({});
  const [uploading, setUploading]     = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);

  const load = useCallback(async (status: Filter) => {
    setLoading(true);
    const apiStatus = status === "priority" ? "pending" : status;
    const res  = await fetch(`/api/admin/news?status=${apiStatus}`, { credentials: "include" });
    const data = await res.json();
    const all  = Array.isArray(data) ? data : [];
    setItems(status === "priority" ? all.filter((n: any) => (n.priority_score ?? 0) >= 5) : all);
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
    setItems((prev) => prev.filter((n) => n.id !== id));
    setWorking(null);
  };

  const generate = async (news: NewsArticle) => {
    setGenerating(news.id);
    setPreview(null);
    try {
      const res  = await fetch(`/api/admin/news/${news.id}/generate`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "خطأ في الإنشاء"); return; }
      setPreview({
        newsId:       news.id,
        title:        data.title,
        excerpt:      data.excerpt,
        content:      data.content,
        image_url:    data.image_url,
        geo:          data.geo ?? "tunisia",
        category:     data.category ?? "سياسة",
        published_at: new Date().toISOString().slice(0, 16),
      });
    } finally {
      setGenerating(null);
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "فشل رفع الصورة"); return; }
      setPreview((p) => p && ({ ...p, image_url: data.url }));
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (news: any) => {
    setPreview({
      newsId:       news.id,
      title:        news.title,
      excerpt:      news.excerpt ?? "",
      content:      news.content ?? "",
      image_url:    news.image_url ?? null,
      geo:          news.geo ?? "general",
      category:     news.category ?? "سياسة",
      published_at: news.published_at
        ? new Date(news.published_at).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      editMode:     true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const publish = async () => {
    if (!preview) return;
    setPublishing(true);
    try {
      const method = preview.editMode ? "PATCH" : "POST";
      const res = await fetch(`/api/admin/news/${preview.newsId}/publish`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(preview),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "خطأ في النشر"); return; }
      if (!preview.editMode) {
        setPublished((prev) => ({ ...prev, [preview.newsId]: data.url }));
        setItems((prev) => prev.filter((n) => n.id !== preview.newsId));
      }
      setPreview(null);
    } finally {
      setPublishing(false);
    }
  };

  const hardDelete = async (id: string) => {
    if (!confirm("حذف هذا الخبر نهائياً؟")) return;
    setDeleting(id);
    await fetch("/api/admin/news", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((n) => n.id !== id));
    setDeleting(null);
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
          style={{ borderColor: "#2E2A18", color: DIM }}
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
              borderColor: filter === tab ? GOLD : "#2E2A18",
              color:       filter === tab ? GOLD : DIM,
              background:  filter === tab ? "rgba(201,168,68,0.08)" : "transparent",
            }}
          >
            {LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Preview / Edit panel */}
      {preview && (
        <div
          className="mb-6 p-5 rounded-xl space-y-4"
          style={{ background: "#1A1810", border: `1px solid ${GOLD}44` }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: GOLD }}>
              {preview.editMode ? "✏️ تعديل التقرير" : "📝 معاينة التقرير — يمكنك التعديل قبل النشر"}
            </h2>
            <button onClick={() => setPreview(null)} className="text-xs" style={{ color: DIM }}>✕ إلغاء</button>
          </div>

          {/* Image — upload file OR paste URL */}
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: DIM }}>صورة المقال</label>
            <div className="flex gap-2 items-center mb-2">
              <label
                className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer shrink-0"
                style={{ background: uploading ? "rgba(201,168,68,0.05)" : "rgba(201,168,68,0.12)", color: GOLD, border: `1px solid rgba(201,168,68,0.3)` }}
              >
                {uploading ? "⏳ جارٍ الرفع..." : "📎 رفع صورة"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
                />
              </label>
              <input
                type="url"
                style={{ ...inputStyle, resize: undefined }}
                placeholder="أو الصق رابط الصورة هنا..."
                value={preview.image_url ?? ""}
                onChange={(e) => setPreview((p) => p && ({ ...p, image_url: e.target.value || null }))}
                onFocus={(e) => (e.target.style.borderColor = GOLD)}
                onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>
            {preview.image_url && (
              <img src={preview.image_url} alt="" className="w-full max-h-48 object-cover rounded-lg" />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: DIM }}>العنوان</label>
            <textarea
              rows={2}
              style={inputStyle}
              value={preview.title}
              onChange={(e) => setPreview((p) => p && ({ ...p, title: e.target.value }))}
              onFocus={(e) => (e.target.style.borderColor = GOLD)}
              onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: DIM }}>المقدمة</label>
            <textarea
              rows={3}
              style={inputStyle}
              value={preview.excerpt}
              onChange={(e) => setPreview((p) => p && ({ ...p, excerpt: e.target.value }))}
              onFocus={(e) => (e.target.style.borderColor = GOLD)}
              onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: DIM }}>تاريخ النشر</label>
            <input
              type="datetime-local"
              style={{ ...inputStyle, resize: undefined }}
              value={preview.published_at}
              onChange={(e) => setPreview((p) => p && ({ ...p, published_at: e.target.value }))}
              onFocus={(e) => (e.target.style.borderColor = GOLD)}
              onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: DIM }}>المحتوى (HTML)</label>
            <textarea
              rows={10}
              style={inputStyle}
              value={preview.content}
              onChange={(e) => setPreview((p) => p && ({ ...p, content: e.target.value }))}
              onFocus={(e) => (e.target.style.borderColor = GOLD)}
              onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={publish}
              disabled={publishing}
              className="px-5 py-2.5 rounded-full text-sm font-bold"
              style={{ background: `linear-gradient(135deg, ${GOLD}, #9A7B28)`, color: "#111008" }}
            >
              {publishing ? "⏳ جارٍ الحفظ..." : preview.editMode ? "💾 حفظ التعديلات" : "🚀 نشر على الموقع وفيسبوك وتيليغرام وX"}
            </button>
            <button onClick={() => setPreview(null)} className="text-xs" style={{ color: DIM }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: DIM }}>جارٍ التحميل...</p>
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: DIM }}>
              {filter === "pending" ? "لا توجد أخبار جديدة — اضغط «جلب أخبار جديدة» أعلاه" : "لا توجد عناصر في هذه الفئة"}
            </p>
          </div>
        )}

        {items.map((news) => {
          const priority = (news as any).priority_score ?? 0;
          const isUrgent = priority >= 8;
          const isHigh   = priority >= 5 && priority < 8;
          const isPreviewing = preview?.newsId === news.id;
          const doneUrl = published[news.id];

          return (
            <div key={news.id}>
              <div
                className="flex gap-4 p-4 rounded-xl"
                style={{
                  background:  isPreviewing ? "rgba(201,168,68,0.06)" : isUrgent ? "rgba(255,107,107,0.06)" : isHigh ? "rgba(201,168,68,0.06)" : "#1A1810",
                  border:      isPreviewing ? `1px solid ${GOLD}66` : isUrgent ? "1px solid rgba(255,107,107,0.3)" : isHigh ? "1px solid rgba(201,168,68,0.25)" : "1px solid #2E2A18",
                  opacity:     working === news.id ? 0.5 : 1,
                }}
              >
                {news.image_url && (
                  <img
                    src={news.image_url}
                    alt=""
                    className="w-24 h-16 rounded-lg object-cover shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {isUrgent && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,107,107,0.2)", color: RED }}>⭐⭐ عاجل</span>
                    )}
                    {isHigh && !isUrgent && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(201,168,68,0.2)", color: GOLD }}>⭐ أولوية</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(201,168,68,0.12)", color: GOLD }}>
                      {news.source}
                    </span>
                    {news.category && (
                      <span className="text-xs" style={{ color: DIM }}>{news.category}</span>
                    )}
                    <span className="text-xs mr-auto" style={{ color: DIM }}>{timeAgo(news.published_at)}</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug mb-1" style={{ color: "#F0EAD6" }}>{news.title}</p>
                  {news.excerpt && (
                    <p className="text-xs line-clamp-2 mb-1" style={{ color: DIM }}>{news.excerpt}</p>
                  )}
                  <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: DIM }}>
                    المصدر الأصلي ↗
                  </a>
                </div>

                <div className="flex flex-col gap-2 shrink-0 justify-center">
                  {filter !== "approved" && (
                    <button
                      onClick={() => update(news.id, "approved")}
                      disabled={working === news.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(107,203,119,0.15)", color: GREEN }}
                    >
                      {working === news.id ? "..." : "نشر ✓"}
                    </button>
                  )}
                  {filter !== "rejected" && (
                    <button
                      onClick={() => update(news.id, "rejected")}
                      disabled={working === news.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(255,107,107,0.15)", color: RED }}
                    >
                      رفض ✗
                    </button>
                  )}
                  {filter !== "pending" && (
                    <button
                      onClick={() => update(news.id, "pending")}
                      disabled={working === news.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(201,168,68,0.1)", color: GOLD }}
                    >
                      إعادة
                    </button>
                  )}

                  {/* Hard delete — rejected items or non-البلاغ approved items */}
                  {(filter === "rejected" || (filter === "approved" && (news as any).source !== "البلاغ")) && (
                    <button
                      onClick={() => hardDelete(news.id)}
                      disabled={deleting === news.id || working === news.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(255,107,107,0.1)", color: RED, border: "1px solid rgba(255,107,107,0.2)" }}
                    >
                      {deleting === news.id ? "..." : "🗑️"}
                    </button>
                  )}

                  {/* Edit button for published البلاغ articles */}
                  {(news as any).source === "البلاغ" && (
                    <button
                      onClick={() => openEdit(news)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: "rgba(201,168,68,0.1)", color: GOLD, border: `1px solid rgba(201,168,68,0.3)` }}
                    >
                      ✏️ تعديل
                    </button>
                  )}

                  {doneUrl ? (
                    <a
                      href={doneUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-center"
                      style={{ background: "rgba(201,168,68,0.15)", color: GOLD, textDecoration: "none" }}
                    >
                      ✓ عرض ↗
                    </a>
                  ) : (news as any).source !== "البلاغ" && (
                    <button
                      onClick={() => generate(news)}
                      disabled={generating === news.id || working === news.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{
                        background: isPreviewing ? `rgba(201,168,68,0.15)` : "rgba(201,168,68,0.08)",
                        color: GOLD,
                        border: `1px solid rgba(201,168,68,0.3)`,
                      }}
                    >
                      {generating === news.id ? "⏳ جارٍ..." : isPreviewing ? "✍️ إعادة" : "✍️ تقرير"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
