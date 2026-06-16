"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NEWS_CATEGORIES } from "@/types";
import CoverUpload from "@/components/admin/CoverUpload";

const GEO_OPTIONS = [
  { value: "tunisia",       label: "تونس" },
  { value: "arab",          label: "عربي" },
  { value: "international", label: "دولي" },
  { value: "general",       label: "عام" },
];

export default function NewNewsPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingFbImage, setGeneratingFbImage] = useState(false);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    image_url: "",
    facebook_image: "",
    category: "عام",
    geo: "tunisia",
    published_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const generateImage = async () => {
    setGeneratingImage(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: form.title, excerpt: form.excerpt, target: "news" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "خطأ في إنشاء الصورة"); return; }
      set("image_url", data.url);
    } finally {
      setGeneratingImage(false);
    }
  };

  const generateFacebookImage = async () => {
    setGeneratingFbImage(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: form.title, excerpt: form.excerpt, target: "facebook" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "خطأ في إنشاء الصورة"); return; }
      set("facebook_image", data.url);
    } finally {
      setGeneratingFbImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.content) {
      setError("العنوان والمحتوى مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "حدث خطأ"); return; }
      router.push("/admin/news");
    } catch {
      setError("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "#111008", border: "1px solid #2E2A18", color: "#F0EAD6",
    borderRadius: "8px", padding: "10px 14px", width: "100%",
    outline: "none", fontFamily: "inherit", fontSize: "14px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "12px", color: "#9A9070",
    marginBottom: "6px", fontWeight: "600",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>كتابة تقرير جديد</h1>
          <p className="text-xs mt-1" style={{ color: "#9A9070" }}>
            سيُنشر باسم <span style={{ color: "#C9A844" }}>البلاغ</span> ويُشارك على فيسبوك وتيليغرام وX ولينكدإن
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-5 py-2 rounded-full text-sm font-bold border"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.title || !form.content}
            className="px-5 py-2 rounded-full text-sm font-bold"
            style={{
              background: (form.title && form.content) ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "#2E2A18",
              color: (form.title && form.content) ? "#111008" : "#9A9070",
            }}
          >
            {saving ? "جارٍ النشر..." : "نشر التقرير"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg text-sm"
          style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", color: "#FF6B6B" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <label style={labelStyle}>عنوان التقرير *</label>
            <input
              style={{ ...inputStyle, fontSize: "18px", fontWeight: "700" }}
              placeholder="أدخل عنوان التقرير..."
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
              placeholder="ملخص قصير يظهر في بطاقة التقرير..."
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div>
            <label style={labelStyle}>محتوى التقرير (HTML مدعوم) *</label>
            <textarea
              rows={22}
              style={{ ...inputStyle, resize: "vertical", lineHeight: "2" }}
              placeholder={"اكتب محتوى التقرير هنا...\n\nيمكنك استخدام HTML:\n<h2>عنوان</h2>\n<p>فقرة</p>\n<blockquote>اقتباس</blockquote>"}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="p-4 rounded-xl space-y-4" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
            <div>
              <label style={labelStyle}>التصنيف</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} style={inputStyle}>
                <option value="عام">عام</option>
                {NEWS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>النطاق الجغرافي</label>
              <select value={form.geo} onChange={(e) => set("geo", e.target.value)} style={inputStyle}>
                {GEO_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>تاريخ النشر</label>
              <input
                type="datetime-local"
                style={inputStyle}
                value={form.published_at}
                onChange={(e) => set("published_at", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label style={{ ...labelStyle, marginBottom: 0 }}>صورة الغلاف (16:9)</label>
                <button
                  type="button"
                  onClick={generateImage}
                  disabled={generatingImage || !form.title}
                  className="px-3 py-1 rounded-full text-xs font-bold border transition-all disabled:opacity-50"
                  style={{ borderColor: "#C9A844", color: "#C9A844", background: "rgba(201,168,68,0.08)" }}
                >
                  {generatingImage ? "⏳ جاري الإنشاء..." : "🎨 إنشاء صورة بالذكاء الاصطناعي"}
                </button>
              </div>
              <CoverUpload currentUrl={form.image_url} onUploaded={(url) => set("image_url", url)} />
              <input
                style={{ ...inputStyle, marginTop: 8, fontSize: 12 }}
                placeholder="أو الصق رابط الصورة مباشرة..."
                value={form.image_url}
                onChange={(e) => set("image_url", e.target.value)}
                onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
              />
              {form.image_url && (
                <img src={form.image_url} alt="معاينة" className="mt-2 rounded-lg w-full object-cover"
                  style={{ aspectRatio: "16/9" }} />
              )}
            </div>

            <div className="p-3 rounded-xl" style={{ background: "rgba(24,119,242,0.06)", border: "1px solid rgba(24,119,242,0.2)" }}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold" style={{ color: "#4A90E2" }}>
                  📘 صورة فيسبوك (1:1 مربعة) — اختياري
                </label>
                <button
                  type="button"
                  onClick={generateFacebookImage}
                  disabled={generatingFbImage || !form.title}
                  className="px-3 py-1 rounded-full text-xs font-bold border transition-all disabled:opacity-50"
                  style={{ borderColor: "#4A90E2", color: "#4A90E2", background: "rgba(74,144,226,0.08)" }}
                >
                  {generatingFbImage ? "⏳ جاري الإنشاء..." : "🎨 إنشاء بالذكاء الاصطناعي"}
                </button>
              </div>
              <p className="text-xs mb-2" style={{ color: "#9A9070" }}>
                إذا رفعت صورة هنا، سيُنشر على فيسبوك كصورة بدلاً من رابط. الرابط سيُضاف تلقائياً في أول تعليق.
              </p>
              <CoverUpload
                currentUrl={form.facebook_image}
                onUploaded={(url) => set("facebook_image", url)}
                aspect={1}
                outputWidth={1080}
                outputHeight={1080}
              />
              {form.facebook_image && (
                <button
                  type="button"
                  onClick={() => set("facebook_image", "")}
                  className="text-xs mt-1"
                  style={{ color: "#9A9070" }}
                >
                  ✕ إزالة صورة فيسبوك
                </button>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
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
