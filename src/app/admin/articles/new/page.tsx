"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ARTICLE_CATEGORIES } from "@/types";
import CoverUpload from "@/components/admin/CoverUpload";

export default function NewArticlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writers, setWriters] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    cover_image: "",
    category: ARTICLE_CATEGORIES[0] as string,
    writer_id: "",
    published_at: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetch("/api/admin/writers")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWriters(data); })
      .catch(() => {});
  }, []);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (publish: boolean) => {
    if (!form.title || !form.content) {
      setError("العنوان والمحتوى مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, published: publish }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ أثناء الحفظ");
        return;
      }
      router.push("/admin/articles");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "#111008",
    border: "1px solid #2E2A18",
    color: "#F0EAD6",
    borderRadius: "8px",
    padding: "10px 14px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    fontSize: "14px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    color: "#9A9070",
    marginBottom: "6px",
    fontWeight: "600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>إضافة مقال جديد</h1>
        <div className="flex gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2 rounded-full text-sm font-bold border"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}
          >
            حفظ كمسودة
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.title}
            className="px-5 py-2 rounded-full text-sm font-bold"
            style={{
              background: form.title ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "#2E2A18",
              color: form.title ? "#111008" : "#9A9070",
            }}
          >
            {saving ? "جارٍ الحفظ..." : "نشر المقال"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mb-6 p-3 rounded-lg text-sm"
          style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <label style={labelStyle}>عنوان المقال *</label>
            <input
              style={{ ...inputStyle, fontSize: "18px", fontWeight: "700" }}
              placeholder="أدخل عنوان المقال..."
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div>
            <label style={labelStyle}>مقدمة / خلاصة</label>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="ملخص قصير يظهر في بطاقة المقال..."
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div>
            <label style={labelStyle}>محتوى المقال (HTML مدعوم) *</label>
            <textarea
              rows={20}
              style={{ ...inputStyle, resize: "vertical", lineHeight: "2" }}
              placeholder={"اكتب محتوى المقال هنا...\n\nيمكنك استخدام HTML:\n<h2>عنوان</h2>\n<p>فقرة</p>\n<blockquote>اقتباس</blockquote>"}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
        </div>

        {/* Sidebar options */}
        <div className="space-y-5">
          <div
            className="p-4 rounded-xl space-y-4"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <div>
              <label style={labelStyle}>التصنيف</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                style={inputStyle}
              >
                {ARTICLE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>الكاتب</label>
              <select
                value={form.writer_id}
                onChange={(e) => set("writer_id", e.target.value)}
                style={inputStyle}
              >
                <option value="">-- اختر كاتباً --</option>
                {writers.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>تاريخ النشر</label>
              <input
                type="date"
                style={inputStyle}
                value={form.published_at}
                onChange={(e) => set("published_at", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>

            <div>
              <label style={labelStyle}>صورة الغلاف</label>
              <CoverUpload currentUrl={form.cover_image} onUploaded={(url) => set("cover_image", url)} />
              <input
                style={{ ...inputStyle, marginTop: 8, fontSize: 12 }}
                placeholder="أو الصق رابط الصورة مباشرة..."
                value={form.cover_image}
                onChange={(e) => set("cover_image", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
              />
              {form.cover_image && (
                <img
                  src={form.cover_image}
                  alt="معاينة"
                  className="mt-2 rounded-lg w-full object-cover"
                  style={{ aspectRatio: "16/9" }}
                />
              )}
            </div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <h3 className="text-xs font-bold mb-3" style={{ color: "#C9A844" }}>تلميحات HTML</h3>
            <ul className="text-xs space-y-1.5" style={{ color: "#9A9070" }}>
              <li><code style={{ color: "#E8D5A3" }}>&lt;h2&gt;</code> — عنوان فرعي</li>
              <li><code style={{ color: "#E8D5A3" }}>&lt;p&gt;</code> — فقرة</li>
              <li><code style={{ color: "#E8D5A3" }}>&lt;blockquote&gt;</code> — اقتباس</li>
              <li><code style={{ color: "#E8D5A3" }}>&lt;strong&gt;</code> — نص عريض</li>
              <li><code style={{ color: "#E8D5A3" }}>&lt;ul&gt;&lt;li&gt;</code> — قائمة</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
