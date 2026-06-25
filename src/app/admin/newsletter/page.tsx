"use client";

import { useState, useEffect } from "react";

interface PaidSubscriber { id: string; email: string; name: string | null; plan: string; status: string; }
interface FreeSubscriber { id: string; email: string; name: string | null; status: string; created_at: string; }
interface Video          { id: string; title: string; video_url: string; published_at: string | null; }
interface Article        { id: string; title: string; slug: string; excerpt: string | null; }
interface NewsItem        { id: string; title: string; url: string; source: string; }

export default function NewsletterPage() {
  const [paidSubscribers, setPaidSubscribers] = useState<PaidSubscriber[]>([]);
  const [freeSubscribers, setFreeSubscribers] = useState<FreeSubscriber[]>([]);
  const [subject, setSubject]       = useState("");
  const [intro, setIntro]           = useState("");
  const [selectedVideos,   setSelectedVideos]   = useState<Video[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
  const [selectedNews,     setSelectedNews]     = useState<NewsItem[]>([]);
  const [videos,   setVideos]   = useState<Video[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [news,     setNews]     = useState<NewsItem[]>([]);
  const [sending, setSending]   = useState(false);
  const [sent,    setSent]      = useState<string | null>(null);
  const [tab, setTab]           = useState<"compose" | "subscribers">("compose");
  const [subTab, setSubTab]     = useState<"paid" | "free">("free");

  useEffect(() => {
    fetch("/api/admin/newsletter/data")
      .then(r => r.json())
      .then(d => {
        setPaidSubscribers(d.subscribers     ?? []);
        setFreeSubscribers(d.freeSubscribers ?? []);
        setVideos(d.videos   ?? []);
        setArticles(d.articles ?? []);
        setNews(d.news       ?? []);
        setSelectedVideos(d.videos?.slice(0, 3)   ?? []);
        setSelectedArticles(d.articles?.slice(0, 3) ?? []);
        setSelectedNews(d.news?.slice(0, 5)       ?? []);
      });
  }, []);

  function toggleItem<T extends { id: string }>(list: T[], item: T, setter: (v: T[]) => void) {
    const exists = list.some(i => i.id === item.id);
    setter(exists ? list.filter(i => i.id !== item.id) : [...list, item]);
  }

  async function sendNewsletter() {
    if (!subject || !selectedVideos.length) return;
    setSending(true);
    const res = await fetch("/api/admin/newsletter/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, intro, videos: selectedVideos, articles: selectedArticles, news: selectedNews }),
    });
    const data = await res.json();
    setSending(false);
    setSent(data.sent !== undefined ? `تم الإرسال إلى ${data.sent} مشترك` : `خطأ: ${data.error}`);
  }

  const activePaid = paidSubscribers.filter(s => s.status === "active").length;
  const activeFree = freeSubscribers.filter(s => s.status === "active").length;
  const totalActive = activePaid + activeFree;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold" style={{ color: "#E8D5A3" }}>النشرة الأسبوعية</h1>
        <div className="flex gap-2">
          <span className="text-sm px-3 py-1 rounded-full" style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}>
            {totalActive} إجمالي
          </span>
          <span className="text-sm px-3 py-1 rounded-full" style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80" }}>
            {activeFree} مجاني
          </span>
          <span className="text-sm px-3 py-1 rounded-full" style={{ background: "rgba(201,168,68,0.08)", color: "#9A9070" }}>
            {activePaid} مدفوع
          </span>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 mb-6">
        {(["compose", "subscribers"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: tab === t ? "#C9A844" : "rgba(201,168,68,0.08)",
              color:      tab === t ? "#0D0B06"  : "#9A9070",
            }}
          >
            {t === "compose" ? "تأليف النشرة" : "المشتركون"}
          </button>
        ))}
      </div>

      {tab === "subscribers" && (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-2 mb-4">
            {(["free", "paid"] as const).map(t => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: subTab === t ? (t === "free" ? "rgba(74,222,128,0.15)" : "rgba(201,168,68,0.15)") : "rgba(255,255,255,0.04)",
                  color:      subTab === t ? (t === "free" ? "#4ade80" : "#C9A844") : "#6B6040",
                  border:     `1px solid ${subTab === t ? (t === "free" ? "rgba(74,222,128,0.3)" : "rgba(201,168,68,0.3)") : "#2E2A18"}`,
                }}
              >
                {t === "free" ? `المجانيون (${activeFree})` : `المدفوعون (${activePaid})`}
              </button>
            ))}
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2E2A18" }}>
            {subTab === "free" ? (
              <table className="w-full text-sm">
                <thead style={{ background: "#1A1810" }}>
                  <tr>
                    {["البريد", "الاسم", "الحالة", "تاريخ الاشتراك"].map(h => (
                      <th key={h} className="text-right px-4 py-3 font-bold" style={{ color: "#4ade80" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {freeSubscribers.map(s => (
                    <tr key={s.id} style={{ borderTop: "1px solid #1A1810" }}>
                      <td className="px-4 py-3" style={{ color: "#E8D5A3" }}>{s.email}</td>
                      <td className="px-4 py-3" style={{ color: "#9A9070" }}>{s.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{
                          background: s.status === "active" ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
                          color:      s.status === "active" ? "#4ade80"              : "#ef4444",
                        }}>
                          {s.status === "active" ? "نشط" : "ملغى"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#6B6040" }}>
                        {new Date(s.created_at).toLocaleDateString("ar-TN")}
                      </td>
                    </tr>
                  ))}
                  {freeSubscribers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: "#6B6040" }}>لا يوجد مشتركون مجانيون بعد</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead style={{ background: "#1A1810" }}>
                  <tr>
                    {["البريد", "الاسم", "الخطة", "الحالة"].map(h => (
                      <th key={h} className="text-right px-4 py-3 font-bold" style={{ color: "#C9A844" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paidSubscribers.map(s => (
                    <tr key={s.id} style={{ borderTop: "1px solid #1A1810" }}>
                      <td className="px-4 py-3" style={{ color: "#E8D5A3" }}>{s.email}</td>
                      <td className="px-4 py-3" style={{ color: "#9A9070" }}>{s.name ?? "—"}</td>
                      <td className="px-4 py-3" style={{ color: "#9A9070" }}>{s.plan}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{
                          background: s.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color:      s.status === "active" ? "#22c55e"              : "#ef4444",
                        }}>
                          {s.status === "active" ? "نشط" : s.status === "cancelled" ? "ملغى" : "متأخر"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paidSubscribers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: "#6B6040" }}>لا يوجد مشتركون مدفوعون بعد</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: compose */}
          <div className="space-y-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#9A9070" }}>عنوان النشرة</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="نشرة البلاغ الأسبوعية — بتاريخ ..."
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ background: "#1A1810", border: "1px solid #2E2A18", color: "#E8D5A3" }}
              />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "#9A9070" }}>مقدمة النشرة (اختياري)</label>
              <textarea
                value={intro}
                onChange={e => setIntro(e.target.value)}
                rows={3}
                placeholder="كلمة افتتاحية لهذا الأسبوع..."
                className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                style={{ background: "#1A1810", border: "1px solid #2E2A18", color: "#E8D5A3" }}
              />
            </div>

            {/* Videos */}
            <div>
              <p className="text-sm font-bold mb-2" style={{ color: "#C9A844" }}>البث المباشر / الحلقات ({selectedVideos.length} مختار)</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {videos.map(v => (
                  <label key={v.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <input
                      type="checkbox"
                      checked={selectedVideos.some(i => i.id === v.id)}
                      onChange={() => toggleItem(selectedVideos, v, setSelectedVideos)}
                      className="accent-yellow-500"
                    />
                    <span className="text-sm" style={{ color: "#9A9070" }}>{v.title}</span>
                  </label>
                ))}
                {videos.length === 0 && <p className="text-xs px-2" style={{ color: "#6B6040" }}>لا توجد حلقات هذا الأسبوع</p>}
              </div>
            </div>

            {/* Articles */}
            <div>
              <p className="text-sm font-bold mb-2" style={{ color: "#C9A844" }}>المقالات ({selectedArticles.length} مختار)</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {articles.map(a => (
                  <label key={a.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <input
                      type="checkbox"
                      checked={selectedArticles.some(i => i.id === a.id)}
                      onChange={() => toggleItem(selectedArticles, a, setSelectedArticles)}
                      className="accent-yellow-500"
                    />
                    <span className="text-sm" style={{ color: "#9A9070" }}>{a.title}</span>
                  </label>
                ))}
                {articles.length === 0 && <p className="text-xs px-2" style={{ color: "#6B6040" }}>لا توجد مقالات هذا الأسبوع</p>}
              </div>
            </div>

            {/* News */}
            <div>
              <p className="text-sm font-bold mb-2" style={{ color: "#C9A844" }}>أبرز الأخبار ({selectedNews.length} مختار)</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {news.map(n => (
                  <label key={n.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <input
                      type="checkbox"
                      checked={selectedNews.some(i => i.id === n.id)}
                      onChange={() => toggleItem(selectedNews, n, setSelectedNews)}
                      className="accent-yellow-500"
                    />
                    <span className="text-sm" style={{ color: "#9A9070" }}>{n.title}</span>
                  </label>
                ))}
                {news.length === 0 && <p className="text-xs px-2" style={{ color: "#6B6040" }}>لا توجد أخبار هذا الأسبوع</p>}
              </div>
            </div>

            {sent && (
              <p className="text-sm text-center py-2 rounded-lg"
                style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}>
                {sent}
              </p>
            )}

            <button
              onClick={sendNewsletter}
              disabled={sending || !subject || totalActive === 0}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{
                background: "#C9A844",
                color: "#0D0B06",
                opacity: (sending || !subject || totalActive === 0) ? 0.5 : 1,
              }}
            >
              {sending ? "جارٍ الإرسال..." : `إرسال إلى ${totalActive} مشترك`}
            </button>
          </div>

          {/* Right: preview */}
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: "#9A9070" }}>معاينة</p>
            <div
              className="rounded-xl p-5 text-sm space-y-4"
              style={{ background: "#1A1810", border: "1px solid #2E2A18", color: "#E8D5A3" }}
              dir="rtl"
            >
              <p className="font-black text-base" style={{ color: "#C9A844" }}>{subject || "عنوان النشرة"}</p>
              {intro && <p style={{ color: "#9A9070" }}>{intro}</p>}
              {selectedVideos.length > 0 && (
                <div>
                  <p className="font-bold mb-2" style={{ color: "#C9A844" }}>📺 حلقات هذا الأسبوع</p>
                  {selectedVideos.map(v => (
                    <p key={v.id} className="mb-1" style={{ color: "#9A9070" }}>• {v.title}</p>
                  ))}
                </div>
              )}
              {selectedArticles.length > 0 && (
                <div>
                  <p className="font-bold mb-2" style={{ color: "#C9A844" }}>✍️ أحدث المقالات</p>
                  {selectedArticles.map(a => (
                    <p key={a.id} className="mb-1" style={{ color: "#9A9070" }}>• {a.title}</p>
                  ))}
                </div>
              )}
              {selectedNews.length > 0 && (
                <div>
                  <p className="font-bold mb-2" style={{ color: "#C9A844" }}>📰 أبرز الأخبار</p>
                  {selectedNews.map(n => (
                    <p key={n.id} className="mb-1" style={{ color: "#9A9070" }}>• {n.title}</p>
                  ))}
                </div>
              )}
              <p style={{ color: "#6B6040", fontSize: "11px" }}>
                — فريق البلاغ · albaalaagh.com
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
