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

export default function NewsSubmitForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [form, setForm] = useState({
    title:     "",
    excerpt:   "",
    content:   "",
    image_url: "",
    category:  NEWS_CATEGORIES[0] as string,
    geo:       "tunisia",
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const inputStyle: React.CSSProperties = {
    background: "#111008",
    border: "1px solid #2E2A18",
    color: "#F0EAD6",
    borderRadius: 8,
    padding: "10px 14px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 14,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "#9A9070",
    marginBottom: 6,
    fontWeight: 600,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.excerpt) {
      setError("العنوان والمقدمة مطلوبان");
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black mb-1" style={{ color: "#F0EAD6" }}>إرسال خبر جديد</h1>
          <p className="text-sm" style={{ color: "#9A9070" }}>سيُراجع الخبر من قِبل المحرر الرئيسي قبل النشر</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/writer/news")}
            className="px-5 py-2 rounded-full text-sm border"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit as any}
            disabled={saving || !form.title || !form.excerpt}
            className="px-6 py-2 rounded-full text-sm font-bold disabled:opacity-50"
            style={{
              background: form.title && form.excerpt
                ? "linear-gradient(135deg, #C9A844, #9A7B28)"
                : "#2E2A18",
              color: form.title && form.excerpt ? "#111008" : "#9A9070",
            }}
          >
            {saving ? "جارٍ الإرسال..." : "إرسال للمراجعة"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg text-sm" style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#FF6B6B" }}>
          {error}
        </div>
      )}

      <div
        className="mb-5 p-3 rounded-lg text-xs"
        style={{ background: "rgba(201,168,68,0.08)", border: "1px solid rgba(201,168,68,0.2)", color: "#C9A844" }}
      >
        أكمل العنوان والمقدمة كحدٍّ أدنى. أضف نص الخبر كاملاً إن توفّر. عند الجاهزية اضغط "إرسال للمراجعة".
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main editor — 2/3 */}
          <div className="lg:col-span-2 space-y-5">

            <div>
              <label style={{ ...labelStyle, color: "#C9A844" }}>العنوان *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="عنوان الخبر..."
                required
                style={{ ...inputStyle, fontSize: 18, fontWeight: 700 }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>

            <div>
              <label style={{ ...labelStyle, color: "#C9A844" }}>المقدمة / خلاصة الخبر *</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                placeholder="اكتب مقدمة أو ملخصاً للخبر (2-4 جمل)..."
                required
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: "1.9" }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>

            <div>
              <label style={labelStyle}>نص الخبر الكامل (اختياري)</label>
              <textarea
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder={"اكتب نص الخبر كاملاً هنا...\n\nيمكنك استخدام HTML:\n<p>فقرة</p>\n<h2>عنوان فرعي</h2>\n<blockquote>اقتباس</blockquote>\n<strong>نص عريض</strong>"}
                rows={18}
                style={{ ...inputStyle, resize: "vertical", lineHeight: "2" }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e)  => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>
          </div>

          {/* Sidebar — 1/3 */}
          <div className="space-y-5">
            <div className="p-4 rounded-xl space-y-4" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>

              <div>
                <label style={labelStyle}>التصنيف</label>
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
                <label style={labelStyle}>النطاق الجغرافي</label>
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

              <div>
                <label style={labelStyle}>رابط الصورة (اختياري)</label>
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
                  <img
                    src={form.image_url}
                    alt=""
                    className="mt-2 rounded-lg w-full object-cover"
                    style={{ aspectRatio: "16/9" }}
                  />
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: "#C9A844" }}>تنسيق HTML</h3>
              <ul className="text-xs space-y-1.5" style={{ color: "#9A9070" }}>
                <li><code style={{ color: "#E8D5A3" }}>&lt;p&gt;</code> — فقرة</li>
                <li><code style={{ color: "#E8D5A3" }}>&lt;h2&gt;</code> — عنوان فرعي</li>
                <li><code style={{ color: "#E8D5A3" }}>&lt;blockquote&gt;</code> — اقتباس</li>
                <li><code style={{ color: "#E8D5A3" }}>&lt;strong&gt;</code> — نص عريض</li>
                <li><code style={{ color: "#E8D5A3" }}>&lt;em&gt;</code> — نص مائل</li>
                <li><code style={{ color: "#E8D5A3" }}>&lt;ul&gt;&lt;li&gt;</code> — قائمة</li>
                <li><code style={{ color: "#E8D5A3" }}>&lt;a href=""&gt;</code> — رابط</li>
              </ul>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
