"use client";

import { useState, useEffect } from "react";
import CoverUpload from "@/components/admin/CoverUpload";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  display_order: number;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  playlist_id: string | null;
}

const inputStyle = {
  background: "#111008", border: "1px solid #2E2A18", color: "#F0EAD6",
  borderRadius: "8px", padding: "10px 14px", width: "100%",
  outline: "none", fontFamily: "inherit", fontSize: "14px",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", color: "#9A9070", marginBottom: "6px", fontWeight: "600",
};
const EMPTY_FORM = { name: "", description: "", thumbnail_url: "", display_order: "0" };

export default function AdminPlaylistsPage() {
  const [playlists, setPlaylists]         = useState<Playlist[]>([]);
  const [allVideos, setAllVideos]         = useState<Video[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [form, setForm]                   = useState({ ...EMPTY_FORM });
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [videoSearch, setVideoSearch]     = useState("");
  const [assigning, setAssigning]         = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function loadPlaylists() {
    setLoading(true);
    const res = await fetch("/api/admin/playlists", { credentials: "include" });
    if (res.ok) setPlaylists(await res.json());
    setLoading(false);
  }

  async function loadVideos() {
    const res = await fetch("/api/admin/videos", { credentials: "include" });
    if (res.ok) setAllVideos(await res.json());
  }

  useEffect(() => { loadPlaylists(); loadVideos(); }, []);

  async function handleSave() {
    if (!form.name.trim()) { setError("اسم البرنامج مطلوب"); return; }
    setSaving(true); setError(null);
    try {
      const url    = editingId ? `/api/admin/playlists/${editingId}` : "/api/admin/playlists";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name:          form.name.trim(),
          description:   form.description || null,
          thumbnail_url: form.thumbnail_url || null,
          display_order: parseInt(form.display_order) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "حدث خطأ"); return; }
      setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM });
      loadPlaylists();
    } catch { setError("تعذّر الاتصال بالخادم"); }
    finally { setSaving(false); }
  }

  function startEdit(p: Playlist) {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description ?? "", thumbnail_url: p.thumbnail_url ?? "", display_order: String(p.display_order) });
    setShowForm(true);
    setError(null);
  }

  async function deletePlaylist(id: string, name: string) {
    if (!confirm(`حذف البرنامج "${name}"؟ الفيديوهات لن تُحذف، ستصبح بدون برنامج.`)) return;
    await fetch(`/api/admin/playlists/${id}`, { method: "DELETE", credentials: "include" });
    if (selectedId === id) setSelectedId(null);
    loadPlaylists();
    loadVideos();
  }

  async function toggleVideoPlaylist(video: Video, playlistId: string) {
    setAssigning(video.id);
    const newPlaylistId = video.playlist_id === playlistId ? null : playlistId;
    await fetch(`/api/admin/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ playlist_id: newPlaylistId }),
    });
    setAllVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, playlist_id: newPlaylistId } : v));
    setAssigning(null);
  }

  const selected = playlists.find((p) => p.id === selectedId) ?? null;

  const filteredVideos = allVideos.filter((v) => {
    if (!videoSearch.trim()) return true;
    return v.title.includes(videoSearch.trim());
  });

  const playlistVideos   = filteredVideos.filter((v) => v.playlist_id === selectedId);
  const unassignedVideos = filteredVideos.filter((v) => v.playlist_id === null);
  const otherVideos      = filteredVideos.filter((v) => v.playlist_id !== null && v.playlist_id !== selectedId);

  function videoCount(id: string) {
    return allVideos.filter((v) => v.playlist_id === id).length;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>البرامج والقوائم</h1>
          <p className="text-xs mt-1" style={{ color: "#9A9070" }}>تنظيم الفيديوهات في برامج وسلاسل</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); setError(null); }}
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + برنامج جديد
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8 p-6 rounded-2xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <h2 className="text-lg font-bold mb-5" style={{ color: "#F0EAD6" }}>
            {editingId ? "تعديل البرنامج" : "برنامج جديد"}
          </h2>
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm"
              style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>اسم البرنامج *</label>
                <input style={inputStyle} placeholder="مثال: البلاغ الذكية" value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
              </div>
              <div>
                <label style={labelStyle}>وصف (اختياري)</label>
                <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="وصف مختصر للبرنامج..."
                  value={form.description} onChange={(e) => set("description", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
              </div>
              <div>
                <label style={labelStyle}>ترتيب العرض</label>
                <input type="number" style={inputStyle} value={form.display_order}
                  onChange={(e) => set("display_order", e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>صورة البرنامج (اختياري)</label>
              <CoverUpload currentUrl={form.thumbnail_url} onUploaded={(url) => set("thumbnail_url", url)} />
              {form.thumbnail_url && (
                <img src={form.thumbnail_url} alt="" className="mt-2 rounded-lg w-full object-cover" style={{ aspectRatio: "16/9" }} />
              )}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
              className="px-5 py-2 rounded-full text-sm font-bold border"
              style={{ borderColor: "#2E2A18", color: "#9A9070" }}>إلغاء</button>
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              className="px-5 py-2 rounded-full text-sm font-bold"
              style={{
                background: form.name.trim() ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "#2E2A18",
                color: form.name.trim() ? "#111008" : "#9A9070",
              }}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Playlists list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-12" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>
          ) : playlists.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
              <p className="text-sm" style={{ color: "#9A9070" }}>لا توجد برامج بعد.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playlists.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: selectedId === p.id ? "rgba(201,168,68,0.1)" : "#1A1810",
                    border: `1px solid ${selectedId === p.id ? "rgba(201,168,68,0.4)" : "#2E2A18"}`,
                  }}
                  onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}
                >
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: "#2E2A18" }}>
                      📺
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "#F0EAD6" }}>{p.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>{videoCount(p.id)} فيديو</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                      className="p-1.5 rounded-lg text-xs transition-opacity hover:opacity-70"
                      style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}>✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); deletePlaylist(p.id, p.name); }}
                      className="p-1.5 rounded-lg text-xs transition-opacity hover:opacity-70"
                      style={{ background: "rgba(255,100,100,0.1)", color: "#FF6B6B" }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video assignment panel */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="rounded-xl p-8 text-center" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
              <p className="text-sm" style={{ color: "#9A9070" }}>اختر برنامجاً من القائمة لتعيين فيديوهاته</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
              <div className="px-5 py-4" style={{ borderBottom: "1px solid #2E2A18" }}>
                <p className="font-black text-base" style={{ color: "#C9A844" }}>{selected.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>
                  {videoCount(selected.id)} فيديو في هذا البرنامج — اضغط لإضافة أو إزالة
                </p>
              </div>

              <div className="p-4">
                <input
                  style={{ ...inputStyle, marginBottom: "12px" }}
                  placeholder="بحث في الفيديوهات..."
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                />

                {/* Videos in this playlist */}
                {playlistVideos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold mb-2" style={{ color: "#50C864" }}>
                      ✓ في هذا البرنامج ({playlistVideos.length})
                    </p>
                    <div className="space-y-1">
                      {playlistVideos.map((v) => (
                        <VideoRow key={v.id} video={v} inPlaylist onToggle={() => toggleVideoPlaylist(v, selected.id)} busy={assigning === v.id} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Unassigned videos */}
                {unassignedVideos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold mb-2" style={{ color: "#9A9070" }}>
                      بدون برنامج ({unassignedVideos.length})
                    </p>
                    <div className="space-y-1">
                      {unassignedVideos.map((v) => (
                        <VideoRow key={v.id} video={v} inPlaylist={false} onToggle={() => toggleVideoPlaylist(v, selected.id)} busy={assigning === v.id} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos in other playlists */}
                {otherVideos.length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-2" style={{ color: "#9A9070" }}>
                      في برامج أخرى ({otherVideos.length}) — النقر يحوّلها لهذا البرنامج
                    </p>
                    <div className="space-y-1">
                      {otherVideos.map((v) => (
                        <VideoRow key={v.id} video={v} inPlaylist={false} onToggle={() => toggleVideoPlaylist(v, selected.id)} busy={assigning === v.id} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoRow({ video, inPlaylist, onToggle, busy }: {
  video: Video; inPlaylist: boolean; onToggle: () => void; busy: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      className="w-full flex items-center gap-3 p-2 rounded-lg text-right transition-colors hover:opacity-80"
      style={{ background: inPlaylist ? "rgba(80,200,100,0.07)" : "rgba(255,255,255,0.02)", border: `1px solid ${inPlaylist ? "rgba(80,200,100,0.2)" : "#2E2A18"}` }}
    >
      {video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt="" className="w-10 h-6 rounded object-cover shrink-0" />
      ) : (
        <div className="w-10 h-6 rounded shrink-0 flex items-center justify-center" style={{ background: "#2E2A18" }}>
          <svg viewBox="0 0 24 24" fill="none" width="10" height="10"><polygon points="5,3 19,12 5,21" fill="#C9A844" /></svg>
        </div>
      )}
      <p className="flex-1 text-xs truncate text-right" style={{ color: "#F0EAD6" }}>{video.title}</p>
      <span className="shrink-0 text-xs font-bold" style={{ color: inPlaylist ? "#50C864" : "#9A9070" }}>
        {busy ? "..." : inPlaylist ? "✓ إزالة" : "+ إضافة"}
      </span>
    </button>
  );
}
