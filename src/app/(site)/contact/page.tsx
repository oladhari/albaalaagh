"use client";

import { useState } from "react";
import { SOCIAL_LINKS } from "@/types";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState<"general" | "guest">("general");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Send to API route → email / Supabase storage
    setSubmitted(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="text-center mb-12">
        <h1
          className="text-4xl font-black mb-3"
          style={{
            background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          تواصل معنا
        </h1>
        <p style={{ color: "#9A9070" }}>نسعد بتواصلكم واستفساراتكم وطلبات الضيافة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Form */}
        <div>
          {submitted ? (
            <div
              className="p-8 rounded-2xl text-center"
              style={{ background: "#1A1810", border: "1px solid #C9A844" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"
                style={{ background: "rgba(201,168,68,0.15)" }}
              >
                ✓
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#C9A844" }}>
                تم إرسال رسالتك
              </h3>
              <p className="text-sm" style={{ color: "#9A9070" }}>
                سنتواصل معك في أقرب وقت ممكن
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6 rounded-2xl"
              style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
            >
              {/* Type selector */}
              <div className="flex gap-2">
                {[
                  { value: "general", label: "استفسار عام" },
                  { value: "guest", label: "طلب ضيافة" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value as typeof type)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={{
                      borderColor: type === opt.value ? "#C9A844" : "#2E2A18",
                      color: type === opt.value ? "#C9A844" : "#9A9070",
                      background: type === opt.value ? "rgba(201,168,68,0.08)" : "transparent",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9070" }}>
                    الاسم الكامل *
                  </label>
                  <input
                    required
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                    style={{
                      background: "#111008",
                      border: "1px solid #2E2A18",
                      color: "#F0EAD6",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                    onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9070" }}>
                    البريد الإلكتروني *
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                    style={{
                      background: "#111008",
                      border: "1px solid #2E2A18",
                      color: "#F0EAD6",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                    onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                  />
                </div>
              </div>

              {type === "guest" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9070" }}>
                    الصفة / المنصب
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                    placeholder="مثال: وزير سابق، ناشط حقوقي..."
                    style={{
                      background: "#111008",
                      border: "1px solid #2E2A18",
                      color: "#F0EAD6",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                    onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9070" }}>
                  الموضوع *
                </label>
                <input
                  required
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: "#111008",
                    border: "1px solid #2E2A18",
                    color: "#F0EAD6",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9070" }}>
                  الرسالة *
                </label>
                <textarea
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none"
                  style={{
                    background: "#111008",
                    border: "1px solid #2E2A18",
                    color: "#F0EAD6",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #C9A844, #9A7B28)",
                  color: "#111008",
                }}
              >
                إرسال الرسالة
              </button>
            </form>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div
            className="p-5 rounded-xl"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <h3 className="font-bold text-sm mb-3" style={{ color: "#C9A844" }}>
              للتواصل المباشر
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "#9A9070" }}>
              يمكنكم التواصل معنا عبر منصات التواصل الاجتماعي أو إرسال رسالة عبر النموذج أعلاه. نستقبل طلبات الضيافة والتعاون والاستفسارات الإعلامية.
            </p>
          </div>

          <div
            className="p-5 rounded-xl"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <h3 className="font-bold text-sm mb-4" style={{ color: "#C9A844" }}>
              تابعنا
            </h3>
            <div className="space-y-2">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.icon}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm"
                  style={{ color: "#9A9070" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#C9A844";
                    (e.currentTarget as HTMLElement).style.background = "rgba(201,168,68,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#9A9070";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#C9A844" }} />
                  {s.name}
                  <span className="mr-auto text-xs opacity-60">{s.url.replace("https://", "")}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
