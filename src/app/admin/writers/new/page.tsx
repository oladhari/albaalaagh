"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewWriterPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", title: "", bio: "", image_url: "" });
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/admin/writers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);

    if (res.ok) {
      router.push("/admin/writers");
    } else {
      const data = await res.json();
      alert(data.error || "فشل حفظ الكاتب");
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

  const labelStyle = { display: "block", fontSize: "12px", color: "#9A9070", marginBottom: "6px", fontWeight: "600" as const };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-black mb-8" style={{ color: "#F0EAD6" }}>إضافة كاتب جديد</h1>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>الاسم الكامل *</label>
            <input
              required
              style={inputStyle}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
          <div>
            <label style={labelStyle}>الصفة / المنصب *</label>
            <input
              required
              style={inputStyle}
              placeholder="مثال: أستاذ العلوم السياسية"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>نبذة عن الكاتب</label>
          <textarea
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="اكتب نبذة مختصرة عن الكاتب ومجالات اهتمامه..."
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
            onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
          />
        </div>

        <div>
          <label style={labelStyle}>رابط الصورة الشخصية</label>
          <input
            type="url"
            style={inputStyle}
            placeholder="https://..."
            value={form.image_url}
            onChange={(e) => set("image_url", e.target.value)}
            onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
            onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
          />
          {form.image_url && (
            <img
              src={form.image_url}
              alt="معاينة"
              className="mt-3 w-20 h-20 rounded-full object-cover"
              style={{ border: "2px solid #C9A844" }}
            />
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !form.name}
            className="px-6 py-2.5 rounded-full text-sm font-bold"
            style={{
              background: form.name ? "linear-gradient(135deg, #C9A844, #9A7B28)" : "#2E2A18",
              color: form.name ? "#111008" : "#9A9070",
            }}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الكاتب"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
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
