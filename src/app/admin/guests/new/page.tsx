"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AvatarUpload from "@/components/admin/AvatarUpload";
import { STAFF_ROLES } from "@/lib/staff-roles";

const CATEGORIES = ["وزير", "برلماني", "ناشط", "مفكر", "صحفي", "أكاديمي", "رجل دين", "رئيس دولة", "دبلوماسي", "قاضٍ", "آخر"] as const;

export default function NewGuestPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<{ id: string; title: string }[]>([]);
  const [form, setForm] = useState({
    name: "", title: "", bio: "", image_url: "",
    category: [] as string[],
    tier: "guest" as "guest" | "program",
    is_staff: false,
    roles: [] as string[],
    is_active: true,
    program_names: [] as string[],
  });

  useEffect(() => {
    fetch("/api/admin/youtube/playlists", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPlaylists(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const toggleCategory = (cat: string) =>
    setForm((p) => ({
      ...p,
      category: p.category.includes(cat) ? p.category.filter((c) => c !== cat) : [...p.category, cat],
    }));

  const toggleRole = (role: string) =>
    setForm((p) => ({
      ...p,
      roles: p.roles.includes(role) ? p.roles.filter((r) => r !== role) : [...p.roles, role],
    }));

  const togglePlaylist = (title: string) =>
    setForm((p) => ({
      ...p,
      program_names: p.program_names.includes(title)
        ? p.program_names.filter((x) => x !== title)
        : [...p.program_names, title],
    }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.title) { setError("الاسم والصفة مطلوبان"); return; }
    if (form.category.length === 0) { setError("يرجى اختيار تصنيف واحد على الأقل"); return; }
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
      if (res.ok) router.push("/admin/guests");
      else setError(data.error || "فشل الحفظ");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "#111008", border: "1px solid #2E2A18", color: "#F0EAD6",
    borderRadius: "8px", padding: "10px 14px", width: "100%", outline: "none",
    fontFamily: "inherit", fontSize: "14px",
  };
  const labelStyle = { display: "block", fontSize: "12px", color: "#9A9070", marginBottom: "6px", fontWeight: "600" as const };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>إضافة ضيف جديد</h1>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>الاسم الكامل *</label>
            <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
          </div>
          <div>
            <label style={labelStyle}>الصفة / المنصب *</label>
            <input style={inputStyle} value={form.title} placeholder="مثال: وزير سابق، ناشط حقوقي..."
              onChange={(e) => set("title", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
          </div>
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>التصنيف *</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIES.map((c) => {
              const active = form.category.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleCategory(c)}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{ borderColor: active ? "#C9A844" : "#2E2A18", color: active ? "#111008" : "#9A9070", background: active ? "#C9A844" : "transparent" }}>
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Type */}
        <div>
          <label style={labelStyle}>النوع</label>
          <div className="flex gap-4 mt-1">
            {(["guest", "program"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#F0EAD6" }}>
                <input type="radio" name="tier" checked={form.tier === t} onChange={() => setForm((p) => ({ ...p, tier: t }))} />
                {t === "guest" ? "ضيف حلقة" : "برنامج دوري"}
              </label>
            ))}
          </div>
        </div>

        {/* Playlists — only for program */}
        {form.tier === "program" && playlists.length > 0 && (
          <div>
            <label style={labelStyle}>البرامج على يوتيوب</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {playlists.map((p) => {
                const active = form.program_names.includes(p.title);
                return (
                  <button key={p.id} type="button" onClick={() => togglePlaylist(p.title)}
                    className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{ borderColor: active ? "#C9A844" : "#2E2A18", color: active ? "#111008" : "#9A9070", background: active ? "#C9A844" : "transparent" }}>
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Staff section */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#9A9070" }}>
            <input type="checkbox" checked={form.is_staff}
              onChange={(e) => setForm((p) => ({ ...p, is_staff: e.target.checked }))} />
            طاقم البلاغ (مخفي عن الجمهور)
          </label>
        </div>

        {form.is_staff && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(107,203,119,0.04)", border: "1px solid rgba(107,203,119,0.2)" }}>
            <div className="flex items-center justify-between">
              <label style={{ ...labelStyle, color: "#6BCB77", marginBottom: 0 }}>أدوار في فريق البلاغ</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: form.is_active ? "#6BCB77" : "#FF6B6B" }}>
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                {form.is_active ? "عضو نشط" : "غير نشط حالياً"}
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map((role) => {
                const active = form.roles.includes(role);
                return (
                  <button key={role} type="button" onClick={() => toggleRole(role)}
                    className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{ borderColor: active ? "#6BCB77" : "#2E2A18", color: active ? "#111008" : "#9A9070", background: active ? "#6BCB77" : "transparent" }}>
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bio */}
        <div>
          <label style={labelStyle}>نبذة مختصرة</label>
          <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="معلومات إضافية عن الضيف..."
            value={form.bio} onChange={(e) => set("bio", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
        </div>

        {/* Image upload */}
        <div>
          <label style={labelStyle}>الصورة الشخصية</label>
          <AvatarUpload currentUrl={form.image_url} onUploaded={(url) => set("image_url", url)} />
          <input type="text" style={{ ...inputStyle, marginTop: 8, fontSize: 12 }}
            placeholder="أو الصق رابط الصورة مباشرة..."
            value={form.image_url} onChange={(e) => set("image_url", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")} onBlur={(e) => (e.target.style.borderColor = "#2E2A18")} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}>
            {saving ? "جارٍ الحفظ..." : "إضافة الضيف"}
          </button>
          <button type="button" onClick={() => router.push("/admin/guests")}
            className="px-6 py-2.5 rounded-full text-sm font-medium border"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
