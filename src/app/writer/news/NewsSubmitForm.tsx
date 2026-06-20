"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NEWS_CATEGORIES } from "@/types";

const GEO_OPTIONS = [
  { value: "tunisia",       label: "تونس" },
  { value: "arab",          label: "الوطن العربي" },
  { value: "international", label: "دولي" },
  { value: "general",       label: "عام" },
];

const inputStyle: React.CSSProperties = {
  background: "#111008",
  border: "1px solid #2E2A18",
  color: "#F0EAD6",
  borderRadius: 8,
  padding: "8px 12px",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  fontSize: 13,
};

export default function NewsSubmitForm() {
  const router = useRouter();
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [form, setForm] = useState({
    title:     "",
    excerpt:   "",
    image_url: "",
    category:  NEWS_CATEGORIES[0] as string,
    geo:       "tunisia",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.excerpt) {
      setError("العنوان والملخص مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/writer/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "حدث خطأ"); return; }
      router.push("/writer/news");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#FF6B6B" }}>
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#C9A844" }}>
          العنوان *
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="عنوان الخبر..."
          required
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
          onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
        />
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#C9A844" }}>
          ملخص الخبر *
        </label>
        <textarea
          value={form.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          placeholder="اكتب ملخصاً للخبر (2-4 جمل)..."
          required
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
          onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
          onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9A9070" }}>
          رابط الصورة (اختياري)
        </label>
        <input
          type="url"
          value={form.image_url}
          onChange={(e) => set("image_url", e.target.value)}
          placeholder="https://..."
          style={{ ...inputStyle, direction: "ltr" }}
          onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
          onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
        />
        {form.image_url && (
          <img src={form.image_url} alt="" className="mt-2 rounded-lg w-full object-cover" style={{ aspectRatio: "16/9", maxHeight: 200 }} />
        )}
      </div>

      {/* Category + Geo */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9A9070" }}>
            التصنيف
          </label>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {NEWS_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9A9070" }}>
            النطاق الجغرافي
          </label>
          <select
            value={form.geo}
            onChange={(e) => set("geo", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {GEO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          {saving ? "جاري الإرسال..." : "إرسال للمراجعة"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/writer/news")}
          className="px-5 py-2.5 rounded-full text-sm border"
          style={{ borderColor: "#2E2A18", color: "#9A9070" }}
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
