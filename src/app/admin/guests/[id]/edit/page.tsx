"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import AvatarUpload from "@/components/admin/AvatarUpload";
import { STAFF_ROLES } from "@/lib/staff-roles";

const CATEGORIES = ["وزير", "برلماني", "ناشط", "مفكر", "صحفي", "أكاديمي", "رجل دين", "رئيس دولة", "دبلوماسي", "قاضٍ", "آخر"] as const;

interface Writer { id: string; name: string; title: string; image_url?: string; }

export default function EditGuestPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [form, setForm] = useState({
    name: "", title: "", bio: "", image_url: "",
    category: [] as string[],
    roles: [] as string[],
    is_active: true,
    writer_id: "" as string,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/guests/${id}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/writers", { credentials: "include" }).then((r) => r.json()),
    ]).then(([data, writerList]) => {
      if (data?.name) {
        setIsStaff(!!data.is_staff);
        setForm({
          name:      data.name      ?? "",
          title:     data.title     ?? "",
          bio:       data.bio       ?? "",
          image_url: data.image_url ?? "",
          category:  Array.isArray(data.category) ? data.category : (data.category ? [data.category] : []),
          roles:     Array.isArray(data.roles) ? data.roles.filter(Boolean) : [],
          is_active: data.is_active ?? true,
          writer_id: data.writer_id ?? "",
        });
      }
      setWriters(Array.isArray(writerList) ? writerList : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const toggleCategory = (cat: string) =>
    setForm((p) => ({
      ...p,
      category: p.category.includes(cat)
        ? p.category.filter((c) => c !== cat)
        : [...p.category, cat],
    }));

  const toggleRole = (role: string) =>
    setForm((p) => ({
      ...p,
      roles: p.roles.includes(role)
        ? p.roles.filter((r) => r !== role)
        : [...p.roles, role],
    }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.title) { setError("الاسم والصفة مطلوبان"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/guests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) router.back();
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

  const linkedWriter = writers.find((w) => w.id === form.writer_id);

  if (loading) return <div className="text-center py-20" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>تعديل الضيف</h1>
        {isStaff && (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77", border: "1px solid rgba(107,203,119,0.3)" }}>
            طاقم البلاغ
          </span>
        )}
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">

        {/* Writer link */}
        <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(201,168,68,0.04)", border: "1px solid rgba(201,168,68,0.2)" }}>
          <label style={{ ...labelStyle, color: "#C9A844", marginBottom: 0 }}>ربط بكاتب (اختياري)</label>
          <p className="text-xs" style={{ color: "#9A9070" }}>
            إذا كان هذا الضيف كاتباً في البلاغ، اختره هنا وستُستخدم بياناته (الصورة والنبذة) تلقائياً.
          </p>
          <select
            style={{ ...inputStyle }}
            value={form.writer_id}
            onChange={(e) => setForm((p) => ({ ...p, writer_id: e.target.value }))}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
            onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
          >
            <option value="">— لا يوجد ربط —</option>
            {writers.map((w) => (
              <option key={w.id} value={w.id}>{w.name} — {w.title}</option>
            ))}
          </select>
          {linkedWriter && (
            <div className="flex items-center gap-3 mt-2 p-3 rounded-lg" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
              {linkedWriter.image_url ? (
                <img src={linkedWriter.image_url} alt={linkedWriter.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}>
                  {linkedWriter.name[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-bold" style={{ color: "#F0EAD6" }}>{linkedWriter.name}</p>
                <p className="text-xs" style={{ color: "#9A9070" }}>{linkedWriter.title}</p>
              </div>
              <span className="mr-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}>مرتبط</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>الاسم الكامل *</label>
            <input
              style={inputStyle} value={form.name}
              onChange={(e) => set("name", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
          <div>
            <label style={labelStyle}>الصفة / المنصب *</label>
            <input
              style={inputStyle} value={form.title}
              placeholder="مثال: وزير سابق، ناشط حقوقي..."
              onChange={(e) => set("title", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>التصنيف</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIES.map((c) => {
              const active = form.category.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleCategory(c)}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{ borderColor: active ? "#C9A844" : "#2E2A18", color: active ? "#111008" : "#9A9070", background: active ? "#C9A844" : "transparent" }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Roles — only shown for staff */}
        {isStaff && (
          <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(107,203,119,0.04)", border: "1px solid rgba(107,203,119,0.2)" }}>
            <div className="flex items-center justify-between">
              <label style={{ ...labelStyle, color: "#6BCB77", marginBottom: 0 }}>أدوار في فريق البلاغ (يمكن اختيار أكثر من دور)</label>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: form.is_active ? "#6BCB77" : "#FF6B6B" }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                {form.is_active ? "عضو نشط" : "غير نشط حالياً"}
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map((role) => {
                const active = form.roles.includes(role);
                return (
                  <button key={role} type="button" onClick={() => toggleRole(role)}
                    className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                    style={{ borderColor: active ? "#6BCB77" : "#2E2A18", color: active ? "#111008" : "#9A9070", background: active ? "#6BCB77" : "transparent" }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>نبذة مختصرة {form.writer_id && <span style={{ color: "#C9A844" }}>(ستُستخدم نبذة الكاتب عند العرض)</span>}</label>
          <textarea
            rows={4} style={{ ...inputStyle, resize: "vertical" }}
            placeholder="معلومات إضافية عن الضيف..."
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
            onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
          />
        </div>

        <div>
          <label style={labelStyle}>الصورة الشخصية {form.writer_id && <span style={{ color: "#C9A844" }}>(ستُستخدم صورة الكاتب عند العرض)</span>}</label>
          <AvatarUpload currentUrl={form.image_url} onUploaded={(url) => set("image_url", url)} />
          <input
            type="text" style={{ ...inputStyle, marginTop: 8, fontSize: 12 }}
            placeholder="أو الصق رابط الصورة مباشرة..."
            value={form.image_url}
            onChange={(e) => set("image_url", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
            onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 rounded-full text-sm font-medium border"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
