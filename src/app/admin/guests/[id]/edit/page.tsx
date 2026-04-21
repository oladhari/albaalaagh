"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const CATEGORIES = ["وزير", "برلماني", "ناشط", "مفكر", "صحفي", "أكاديمي", "رجل دين", "رئيس دولة", "دبلوماسي", "قاضٍ", "آخر"] as const;

export default function EditGuestPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", title: "", bio: "", image_url: "", category: [] as string[],
  });

  useEffect(() => {
    fetch(`/api/admin/guests/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.name) {
          setForm({
            name:      data.name      ?? "",
            title:     data.title     ?? "",
            bio:       data.bio       ?? "",
            image_url: data.image_url ?? "",
            category:  Array.isArray(data.category) ? data.category : (data.category ? [data.category] : []),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const toggleCategory = (cat: string) =>
    setForm((p) => ({
      ...p,
      category: p.category.includes(cat)
        ? p.category.filter((c) => c !== cat)
        : [...p.category, cat],
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

  if (loading) return <div className="text-center py-20" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-8" style={{ color: "#F0EAD6" }}>تعديل الضيف</h1>

      {error && (
        <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
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
                <button
                  key={c} type="button" onClick={() => toggleCategory(c)}
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
          <label style={labelStyle}>نبذة مختصرة</label>
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
          <label style={labelStyle}>رابط الصورة الشخصية</label>
          <input
            type="text" style={inputStyle} placeholder="https://..."
            value={form.image_url}
            onChange={(e) => set("image_url", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
            onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
          />
          {form.image_url && (
            <img src={form.image_url} alt="معاينة" className="mt-3 w-20 h-20 rounded-full object-cover" style={{ border: "2px solid #C9A844" }} />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={saving}
            className="px-6 py-2.5 rounded-full text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
          <button
            type="button" onClick={() => router.back()}
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
