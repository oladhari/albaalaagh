"use client";

import { useState } from "react";

const CATEGORIES = ["وزير", "برلماني", "ناشط", "مفكر", "صحفي", "أكاديمي", "آخر"] as const;
type Category = typeof CATEGORIES[number];

interface Video {
  youtube_id: string;
  title: string;
  thumbnail_url: string;
  published_at: string;
}

interface Guest {
  id: string;
  name: string;
  title: string;
  bio: string;
  image_url?: string;
  category: string;
}

interface Props {
  videos: Video[];
  initialGuests: Guest[];
}

const emptyForm = { name: "", title: "", bio: "", image_url: "", category: "آخر" as Category };

export default function GuestsManager({ videos, initialGuests }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  // Fill form from a video title
  const importFromTitle = (title: string) => {
    setSelectedTitle(title);
    // Strip common channel suffixes and separators
    const cleaned = title
      .replace(/[|｜\-–—]\s*(البلاغ|albaalaagh|albalag).*/gi, "")
      .replace(/\s*(حوار|لقاء|مقابلة|نقاش|برنامج|ضيف|مع)\s*/gi, " ")
      .trim();
    setForm((p) => ({ ...p, name: cleaned }));
    // Scroll form into view
    document.getElementById("guest-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const saveGuest = async () => {
    if (!form.name || !form.title || !form.category) {
      setError("الاسم والصفة والتصنيف مطلوبة");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setGuests((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setForm(emptyForm);
      setSelectedTitle(null);
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const deleteGuest = async (id: string) => {
    setDeleting(id);
    await fetch("/api/admin/guests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    setGuests((prev) => prev.filter((g) => g.id !== id));
    setDeleting(null);
  };

  const inputStyle = {
    background: "#111008",
    border: "1px solid #2E2A18",
    color: "#F0EAD6",
    borderRadius: "8px",
    padding: "8px 12px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    fontSize: "13px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    color: "#9A9070",
    marginBottom: "4px",
    fontWeight: "600",
  };

  const runAutoImport = async () => {
    if (!confirm("سيتم استيراد الضيوف تلقائياً من جميع مقاطع القناة. قد يستغرق هذا دقيقة أو أكثر. متابعة؟")) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/guests/import", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.inserted > 0) {
        // Reload page to show new guests
        window.location.reload();
      } else {
        setImportResult(
          `تم الفحص: ${data.fetched} فيديو — استُخرج ${data.extracted} ضيف — أُضيف ${data.inserted} جديد — تخطّى ${data.skipped} مكرر`
        );
      }
    } catch {
      setImportResult("خطأ في الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  const existingNames = new Set(guests.map((g) => g.name));
  const filteredVideos = videos.filter((v) =>
    search ? v.title.includes(search) : true
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>الضيوف</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#9A9070" }}>{guests.length} ضيف</span>
          <button
            onClick={runAutoImport}
            disabled={importing}
            className="px-4 py-2 rounded-full text-sm font-bold border transition-all"
            style={{ borderColor: "#C9A844", color: "#C9A844", background: "rgba(201,168,68,0.08)" }}
          >
            {importing ? "جارٍ الاستيراد..." : "⚡ استيراد تلقائي من يوتيوب"}
          </button>
        </div>
      </div>

      {importResult && (
        <div className="mb-4 px-4 py-3 rounded-xl text-xs" style={{ background: "rgba(107,203,119,0.08)", border: "1px solid rgba(107,203,119,0.3)", color: "#6BCB77" }}>
          {importResult}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Left: Add guest form + existing guests ── */}
        <div className="space-y-6">

          {/* Add form */}
          <div
            id="guest-form"
            className="p-5 rounded-xl space-y-3"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <h2 className="text-sm font-bold mb-1" style={{ color: "#C9A844" }}>
              {selectedTitle ? `من: ${selectedTitle.slice(0, 60)}...` : "إضافة ضيف جديد"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>الاسم الكامل *</label>
                <input
                  style={inputStyle}
                  placeholder="اسم الضيف..."
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>
              <div>
                <label style={labelStyle}>التصنيف *</label>
                <select
                  style={inputStyle}
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>الصفة / المنصب *</label>
              <input
                style={inputStyle}
                placeholder="مثال: وزير سابق، ناشط حقوقي، أستاذ جامعي..."
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>

            <div>
              <label style={labelStyle}>نبذة مختصرة (اختياري)</label>
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="معلومات إضافية عن الضيف..."
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>

            <div>
              <label style={labelStyle}>رابط الصورة (اختياري)</label>
              <input
                style={inputStyle}
                placeholder="https://..."
                value={form.image_url}
                onChange={(e) => set("image_url", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>

            {error && <p className="text-xs" style={{ color: "#FF6B6B" }}>{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={saveGuest}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #C9A844, #9A7B28)",
                  color: "#111008",
                }}
              >
                {saving ? "جارٍ الحفظ..." : "إضافة الضيف"}
              </button>
              {(form.name || form.title) && (
                <button
                  onClick={() => { setForm(emptyForm); setSelectedTitle(null); setError(null); }}
                  className="px-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "#2E2A18", color: "#9A9070" }}
                >
                  إلغاء
                </button>
              )}
            </div>
          </div>

          {/* Existing guests list */}
          <div>
            <h2 className="text-sm font-bold mb-3" style={{ color: "#C9A844" }}>
              الضيوف المُضافون ({guests.length})
            </h2>
            {guests.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "#9A9070" }}>
                لا يوجد ضيوف بعد — اختر مقطعاً من اليمين لإضافة ضيف
              </p>
            ) : (
              <div className="space-y-2">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
                    >
                      {guest.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#F0EAD6" }}>
                        {guest.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "#9A9070" }}>{guest.title}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}
                        >
                          {guest.category}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteGuest(guest.id)}
                      disabled={deleting === guest.id}
                      className="text-xs px-2 py-1 rounded shrink-0"
                      style={{ color: "#FF6B6B", background: "rgba(255,107,107,0.08)" }}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: YouTube videos ── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-bold" style={{ color: "#C9A844" }}>
              مقاطع القناة ({videos.length})
            </h2>
            <input
              style={{ ...inputStyle, width: "auto", flex: 1 }}
              placeholder="بحث في العناوين..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
          <p className="text-xs mb-3" style={{ color: "#9A9070" }}>
            اضغط على المقطع لاستيراد اسم الضيف منه تلقائياً
          </p>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pl-1">
            {filteredVideos.map((video) => {
              const alreadyAdded = [...existingNames].some((name) =>
                video.title.includes(name.split(" ").pop() ?? "")
              );
              return (
                <button
                  key={video.youtube_id}
                  onClick={() => importFromTitle(video.title)}
                  className="w-full text-right flex gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: selectedTitle === video.title ? "rgba(201,168,68,0.1)" : "#1A1810",
                    border: `1px solid ${selectedTitle === video.title ? "#C9A844" : "#2E2A18"}`,
                    opacity: alreadyAdded ? 0.45 : 1,
                  }}
                >
                  <img
                    src={video.thumbnail_url}
                    alt=""
                    className="w-16 h-10 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: "#F0EAD6" }}>
                      {video.title}
                    </p>
                    {alreadyAdded && (
                      <span className="text-xs" style={{ color: "#6BCB77" }}>✓ مُضاف</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
