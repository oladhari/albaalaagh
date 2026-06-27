"use client";

import { useState, useEffect, useRef } from "react";
import CoverUpload from "@/components/admin/CoverUpload";

interface SiteVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  playlist_id: string | null;
  published: boolean;
  display_order: number;
  published_at: string | null;
  created_at: string;
  video_type: "interview" | "short" | "clip";
  hashtags: string | null;
}

interface Playlist { id: string; name: string; }

const EMPTY_FORM = {
  title: "", description: "", video_url: "", thumbnail_url: "",
  display_order: "0", playlist_id: "", published_at: "",
  video_type: "interview", hashtags: "",
};

const VIDEO_TYPES = [
  { value: "interview", label: "حلقة / مقابلة", hint: "تظهر في قسم الحلقات" },
  { value: "short",     label: "مقطع قصير (Shorts)", hint: "فيديو عمودي قصير" },
  { value: "clip",      label: "فيديو (720p)", hint: "فيديو أفقي غير حلقة" },
];

const inputStyle = {
  background: "#111008", border: "1px solid #2E2A18", color: "#F0EAD6",
  borderRadius: "8px", padding: "10px 14px", width: "100%",
  outline: "none", fontFamily: "inherit", fontSize: "14px",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", color: "#9A9070", marginBottom: "6px", fontWeight: "600",
};

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  interview: { label: "حلقة",  color: "#C9A844" },
  short:     { label: "Short", color: "#50C864" },
  clip:      { label: "فيديو", color: "#60A5FA" },
};

export default function AdminVideosPage() {
  const [videos, setVideos]       = useState<SiteVideo[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function loadVideos() {
    setLoading(true);
    const [vRes, pRes] = await Promise.all([
      fetch("/api/admin/videos",    { credentials: "include" }),
      fetch("/api/admin/playlists", { credentials: "include" }),
    ]);
    if (vRes.ok) setVideos(await vRes.json());
    if (pRes.ok) setPlaylists(await pRes.json());
    setLoading(false);
  }

  useEffect(() => { loadVideos(); }, []);

  async function handleVideoFile(file: File) {
    setError(null);
    const presignRes = await fetch("/api/admin/upload/video-presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    });
    if (!presignRes.ok) {
      const d = await presignRes.json();
      setError(d.error ?? "فشل الحصول على رابط الرفع");
      return;
    }
    const { uploadUrl, publicUrl } = await presignRes.json();

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        setUploadProgress(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          set("video_url", publicUrl);
          resolve();
        } else {
          setError("فشل رفع الفيديو");
          reject();
        }
      };
      xhr.onerror = () => { setError("خطأ في الاتصال أثناء الرفع"); reject(); };
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  }

  function startEdit(v: SiteVideo) {
    setEditingId(v.id);
    setForm({
      title:         v.title,
      description:   v.description ?? "",
      video_url:     v.video_url,
      thumbnail_url: v.thumbnail_url ?? "",
      display_order: String(v.display_order),
      playlist_id:   v.playlist_id ?? "",
      published_at:  v.published_at ? v.published_at.slice(0, 10) : "",
      video_type:    v.video_type,
      hashtags:      v.hashtags ?? "",
    });
    setError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!form.title || !form.video_url) { setError("العنوان ورابط الفيديو مطلوبان"); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        title:        form.title,
        description:  form.description || null,
        video_url:    form.video_url,
        thumbnail_url: form.thumbnail_url || null,
        display_order: parseInt(form.display_order) || 0,
        playlist_id:  form.video_type === "interview" ? (form.playlist_id || null) : null,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
        video_type:   form.video_type,
        hashtags:     form.hashtags || null,
      };
      const res = await fetch(
        editingId ? `/api/admin/videos/${editingId}` : "/api/admin/videos",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "حدث خطأ"); return; }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      loadVideos();
    } catch { setError("تعذّر الاتصال بالخادم"); }
    finally { setSaving(false); }
  }

  async function togglePublished(video: SiteVideo) {
    await fetch(`/api/admin/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ published: !video.published }),
    });
    loadVideos();
  }

  async function deleteVideo(id: string) {
    if (!confirm("هل تريد حذف هذا الفيديو؟")) return;
    await fetch(`/api/admin/videos/${id}`, { method: "DELETE", credentials: "include" });
    loadVideos();
  }

  const filtered = filterType === "all" ? videos : videos.filter(v => v.video_type === filterType);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>إدارة الفيديوهات</h1>
          <p className="text-xs mt-1" style={{ color: "#9A9070" }}>حلقات، مقاطع قصيرة، وفيديوهات 720p</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); setError(null); }}
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + إضافة فيديو
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[{ v: "all", l: `الكل (${videos.length})` }, { v: "interview", l: `حلقات (${videos.filter(x=>x.video_type==="interview").length})` }, { v: "short", l: `مقاطع قصيرة (${videos.filter(x=>x.video_type==="short").length})` }, { v: "clip", l: `فيديوهات (${videos.filter(x=>x.video_type==="clip").length})` }].map(t => (
          <button key={t.v} onClick={() => setFilterType(t.v)}
            className="px-4 py-1.5 rounded-full text-xs font-bold border transition-colors"
            style={{ background: filterType === t.v ? "#C9A844" : "transparent", color: filterType === t.v ? "#111008" : "#9A9070", borderColor: filterType === t.v ? "#C9A844" : "#2E2A18" }}>
            {t.l}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mb-8 p-6 rounded-2xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <h2 className="text-lg font-bold mb-5" style={{ color: "#F0EAD6" }}>{editingId ? "تعديل الفيديو" : "فيديو جديد"}</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
              {error}
            </div>
          )}

          {/* Type selector */}
          <div className="mb-5">
            <label style={labelStyle}>نوع الفيديو *</label>
            <div className="flex gap-3 flex-wrap">
              {VIDEO_TYPES.map(t => (
                <button key={t.value} onClick={() => set("video_type", t.value)}
                  className="flex-1 min-w-[140px] p-3 rounded-xl border text-right transition-all"
                  style={{ background: form.video_type === t.value ? "rgba(201,168,68,0.1)" : "#111008", borderColor: form.video_type === t.value ? "#C9A844" : "#2E2A18" }}>
                  <p className="font-bold text-sm" style={{ color: form.video_type === t.value ? "#C9A844" : "#F0EAD6" }}>{t.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>{t.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>عنوان الفيديو *</label>
                <input
                  style={inputStyle}
                  placeholder="أدخل عنوان الفيديو..."
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>

              <div>
                <label style={labelStyle}>وصف الفيديو (اختياري)</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="وصف مختصر للفيديو..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>

              <div>
                <label style={labelStyle}>هاشتاقات (اختياري)</label>
                <input
                  style={inputStyle}
                  placeholder="#البلاغ #سياسة #تونس"
                  value={form.hashtags}
                  onChange={(e) => set("hashtags", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
                <p className="text-xs mt-1" style={{ color: "#9A9070" }}>تظهر في صفحة الفيديو للمشاركة</p>
              </div>

              {form.video_type === "interview" && (
                <div>
                  <label style={labelStyle}>البرنامج / القائمة (اختياري)</label>
                  <select
                    style={{ ...inputStyle, cursor: "pointer" }}
                    value={form.playlist_id}
                    onChange={(e) => set("playlist_id", e.target.value)}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                    onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                  >
                    <option value="">— بدون برنامج —</option>
                    {playlists.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={labelStyle}>تاريخ النشر (اختياري)</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.published_at}
                  onChange={(e) => set("published_at", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>ملف الفيديو * (MP4, WebM, MOV)</label>
                <div
                  className="rounded-lg p-4 text-center cursor-pointer border-2 border-dashed transition-colors"
                  style={{ borderColor: form.video_url ? "#C9A844" : "#2E2A18" }}
                  onClick={() => fileRef.current?.click()}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleVideoFile(file);
                    }}
                  />
                  {uploadProgress !== null ? (
                    <div>
                      <div className="text-sm mb-2" style={{ color: "#C9A844" }}>جارٍ الرفع... {uploadProgress}%</div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#2E2A18" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${uploadProgress}%`, background: "linear-gradient(135deg, #C9A844, #9A7B28)" }} />
                      </div>
                    </div>
                  ) : form.video_url ? (
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#C9A844" }}>✓ تم رفع الفيديو</p>
                      <p className="text-xs mt-1 truncate" style={{ color: "#9A9070" }}>{form.video_url.split("/").pop()}</p>
                      <p className="text-xs mt-1" style={{ color: "#9A9070" }}>اضغط لاختيار ملف آخر</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm" style={{ color: "#9A9070" }}>اضغط لاختيار الفيديو</p>
                      <p className="text-xs mt-1" style={{ color: "#9A9070" }}>أو أدخل رابطاً مباشراً أدناه</p>
                    </div>
                  )}
                </div>
                <input
                  style={{ ...inputStyle, marginTop: 8, fontSize: 12 }}
                  placeholder="أو الصق رابط الفيديو مباشرة..."
                  value={form.video_url}
                  onChange={(e) => set("video_url", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>

              <div>
                <label style={labelStyle}>صورة مصغرة (اختياري)</label>
                <CoverUpload
                  currentUrl={form.thumbnail_url}
                  onUploaded={(url) => set("thumbnail_url", url)}
                />
                {form.thumbnail_url && (
                  <img src={form.thumbnail_url} alt="معاينة" className="mt-2 rounded-lg w-full object-cover"
                    style={{ aspectRatio: form.video_type === "short" ? "9/16" : "16/9", maxHeight: 200, objectFit: "cover" }} />
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
              className="px-5 py-2 rounded-full text-sm font-bold border"
              style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
              إلغاء
            </button>
            <button onClick={handleSubmit} disabled={saving || !form.title || !form.video_url}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{
                background: (form.title && form.video_url) ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "#2E2A18",
                color: (form.title && form.video_url) ? "#111008" : "#9A9070",
              }}>
              {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديلات" : "حفظ الفيديو"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <p className="text-sm" style={{ color: "#9A9070" }}>لا توجد فيديوهات في هذه الفئة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const badge = TYPE_BADGE[v.video_type] ?? TYPE_BADGE.interview;
            return (
              <div key={v.id} className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: "#1A1810", border: "1px solid #2E2A18", opacity: v.published ? 1 : 0.6 }}>
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt="" className="w-24 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-24 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#2E2A18" }}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none"><polygon points="5,3 19,12 5,21" fill="#C9A844" /></svg>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${badge.color}22`, color: badge.color }}>{badge.label}</span>
                    {v.hashtags && <span className="text-xs truncate" style={{ color: "#6B6448" }}>{v.hashtags}</span>}
                  </div>
                  <p className="font-bold text-sm truncate" style={{ color: "#F0EAD6" }}>{v.title}</p>
                  {v.description && <p className="text-xs mt-0.5 truncate" style={{ color: "#9A9070" }}>{v.description}</p>}
                  <p className="text-xs mt-1" style={{ color: "#6B6448" }}>
                    {v.published_at ? new Date(v.published_at).toLocaleDateString("ar-TN") : new Date(v.created_at).toLocaleDateString("ar-TN")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublished(v)} className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: v.published ? "rgba(80,200,100,0.15)" : "rgba(255,100,100,0.1)", color: v.published ? "#50C864" : "#FF6B6B", border: `1px solid ${v.published ? "rgba(80,200,100,0.3)" : "rgba(255,100,100,0.3)"}` }}>
                    {v.published ? "منشور" : "مخفي"}
                  </button>
                  <button onClick={() => startEdit(v)} className="px-3 py-1.5 rounded-full text-xs font-bold border"
                    style={{ borderColor: "#C9A844", color: "#C9A844" }}>
                    تعديل
                  </button>
                  <a href={`/videos/${v.id}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full text-xs font-bold border"
                    style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
                    معاينة
                  </a>
                  <button onClick={() => deleteVideo(v.id)} className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: "rgba(255,100,100,0.1)", color: "#FF6B6B", border: "1px solid rgba(255,100,100,0.3)" }}>
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
