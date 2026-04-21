"use client";

import { useState } from "react";

export const CATEGORIES = ["وزير", "برلماني", "ناشط", "مفكر", "صحفي", "أكاديمي", "رجل دين", "رئيس دولة", "دبلوماسي", "قاضٍ", "آخر"] as const;

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
  category: string[];
  tier: "program" | "guest";
  is_staff: boolean;
  program_name?: string;
  host_id?: string | null;
}

interface Props {
  videos: Video[];
  initialGuests: Guest[];
}

const emptyForm = { name: "", title: "", bio: "", image_url: "", categories: [] as string[], tier: "guest" as "program" | "guest", is_staff: false, program_name: "" };

export default function GuestsManager({ videos, initialGuests }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);

  const set = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const toggleCategory = (cat: string) =>
    setForm((p) => ({
      ...p,
      categories: p.categories.includes(cat)
        ? p.categories.filter((c) => c !== cat)
        : [...p.categories, cat],
    }));

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
    if (!form.name || !form.title || form.categories.length === 0) {
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
        body: JSON.stringify({ ...form, category: form.categories }),
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

  const patchGuest = async (id: string, updates: Partial<Pick<Guest, "tier" | "is_staff" | "program_name" | "host_id">>) => {
    setPatching(id);
    const res = await fetch("/api/admin/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) {
      setGuests((prev) => prev.map((g) => g.id === id ? { ...g, ...updates } : g));
    }
    setPatching(null);
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
    setImportConfirm(false);
    setImporting(true);
    setImportResult(null);

    let offset = 0;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalFetched = 0;

    try {
      while (true) {
        const res = await fetch(`/api/admin/guests/import?offset=${offset}`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setImportResult(`خطأ: ${data.error ?? "غير معروف"}`);
          break;
        }

        totalFetched   = data.fetched;
        totalInserted += data.inserted ?? 0;
        totalUpdated  += data.updated  ?? 0;

        if (!data.hasMore) {
          // Done — reload if anything changed
          if (totalInserted > 0 || totalUpdated > 0) {
            window.location.reload();
          } else {
            setImportResult(
              `تم الفحص: ${totalFetched} بث مباشر — أُضيف ${totalInserted} ضيف جديد — حُدِّث ${totalUpdated} — لا جديد`
            );
          }
          break;
        }

        offset = data.nextOffset;
      }
    } catch (err: any) {
      setImportResult(`خطأ في الاتصال: ${err?.message ?? err}`);
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
          {!importConfirm && !importing && (
            <button
              onClick={() => setImportConfirm(true)}
              className="px-4 py-2 rounded-full text-sm font-bold border transition-all"
              style={{ borderColor: "#C9A844", color: "#C9A844", background: "rgba(201,168,68,0.08)" }}
            >
              ⚡ استيراد تلقائي من يوتيوب
            </button>
          )}
        </div>
      </div>

      {/* Inline confirmation */}
      {importConfirm && !importing && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-4" style={{ background: "rgba(201,168,68,0.06)", border: "1px solid rgba(201,168,68,0.3)", color: "#F0EAD6" }}>
          <span className="flex-1">سيتم استيراد الضيوف من جميع البثوث المباشرة. قد يستغرق دقيقة أو أكثر.</span>
          <button onClick={runAutoImport} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}>تأكيد</button>
          <button onClick={() => setImportConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(255,107,107,0.1)", color: "#FF6B6B" }}>إلغاء</button>
        </div>
      )}

      {/* Loading state */}
      {importing && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-3" style={{ background: "rgba(201,168,68,0.06)", border: "1px solid #2E2A18", color: "#C9A844" }}>
          <span className="inline-block animate-spin">⏳</span>
          <span>جارٍ الاستيراد من يوتيوب وتحليل الضيوف... قد يستغرق عدة دقائق — لا تغلق الصفحة</span>
        </div>
      )}

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
              <label style={labelStyle}>التصنيف * (يمكن اختيار أكثر من واحد)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CATEGORIES.map((c) => {
                  const active = form.categories.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCategory(c)}
                      className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                      style={{
                        borderColor: active ? "#C9A844" : "#2E2A18",
                        color:       active ? "#111008" : "#9A9070",
                        background:  active ? "#C9A844" : "transparent",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
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

            <div>
              <label style={labelStyle}>النوع</label>
              <div className="flex gap-3 mt-1">
                {(["guest", "program"] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#F0EAD6" }}>
                    <input
                      type="radio"
                      name="tier"
                      checked={form.tier === t}
                      onChange={() => setForm((p) => ({ ...p, tier: t }))}
                    />
                    {t === "guest" ? "ضيف حلقة" : "برنامج دوري"}
                  </label>
                ))}
              </div>
            </div>

            {form.tier === "program" && (
              <div>
                <label style={labelStyle}>اسم البرنامج</label>
                <input
                  style={inputStyle}
                  placeholder="مثال: مشهد تونسي، حوار الساعة..."
                  value={form.program_name}
                  onChange={(e) => set("program_name", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>
            )}

            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#9A9070" }}>
              <input
                type="checkbox"
                checked={form.is_staff}
                onChange={(e) => setForm((p) => ({ ...p, is_staff: e.target.checked }))}
              />
              طاقم البلاغ (مخفي عن الجمهور)
            </label>

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
                    className="p-3 rounded-xl space-y-2"
                    style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
                  >
                    <div className="flex items-center gap-3">
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
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs" style={{ color: "#9A9070" }}>{guest.title}</span>
                          {(Array.isArray(guest.category) ? guest.category : [guest.category]).map((c) => (
                            <span
                              key={c}
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}
                            >
                              {c}
                            </span>
                          ))}
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
                    {/* Tier / staff controls */}
                    <div className="flex items-center gap-2 flex-wrap pt-1" style={{ borderTop: "1px solid #2E2A18" }}>
                      <select
                        value={guest.tier ?? "guest"}
                        disabled={patching === guest.id}
                        onChange={(e) => patchGuest(guest.id, { tier: e.target.value as "program" | "guest" })}
                        className="text-xs rounded px-2 py-1"
                        style={{ background: "#111008", color: "#F0EAD6", border: "1px solid #2E2A18" }}
                      >
                        <option value="guest">ضيف حلقة</option>
                        <option value="program">برنامج دوري</option>
                      </select>
                      {guest.tier === "program" && (
                        <>
                          <input
                            className="text-xs rounded px-2 py-1"
                            style={{ background: "#111008", color: "#F0EAD6", border: "1px solid #2E2A18", minWidth: "120px" }}
                            placeholder="اسم البرنامج..."
                            defaultValue={guest.program_name ?? ""}
                            onBlur={(e) => {
                              if (e.target.value !== (guest.program_name ?? "")) {
                                patchGuest(guest.id, { program_name: e.target.value });
                              }
                            }}
                          />
                          <select
                            value={guest.host_id ?? ""}
                            disabled={patching === guest.id}
                            onChange={(e) => patchGuest(guest.id, { host_id: e.target.value || null })}
                            className="text-xs rounded px-2 py-1"
                            style={{ background: "#111008", color: "#F0EAD6", border: "1px solid #2E2A18" }}
                          >
                            <option value="">— المسؤول في البلاغ —</option>
                            {guests.filter((g) => g.is_staff).map((staff) => (
                              <option key={staff.id} value={staff.id}>{staff.name}</option>
                            ))}
                          </select>
                        </>
                      )}
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "#9A9070" }}>
                        <input
                          type="checkbox"
                          checked={guest.is_staff ?? false}
                          disabled={patching === guest.id}
                          onChange={(e) => patchGuest(guest.id, { is_staff: e.target.checked })}
                          className="rounded"
                        />
                        طاقم البلاغ (مخفي عن الجمهور)
                      </label>
                      {patching === guest.id && (
                        <span className="text-xs" style={{ color: "#C9A844" }}>جارٍ الحفظ...</span>
                      )}
                    </div>
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
