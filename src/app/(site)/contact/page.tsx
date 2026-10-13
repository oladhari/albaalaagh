"use client";

import { useState } from "react";
import { SOCIAL_LINKS } from "@/types";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"general" | "guest">("general");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    const form = e.currentTarget;
    const data = {
      type,
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      role: type === "guest" ? (form.elements.namedItem("role") as HTMLInputElement)?.value : undefined,
      subject: (form.elements.namedItem("subject") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "حدث خطأ، يرجى المحاولة مجدداً");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("تعذّر الاتصال بالخادم، يرجى المحاولة لاحقاً");
    } finally {
      setSending(false);
    }
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
        <p className="text-text-muted">نسعد بتواصلكم واستفساراتكم وطلبات الضيافة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* Form */}
        <div>
          {submitted ? (
            <div
              className="p-8 rounded-2xl text-center bg-bg-card border border-gold"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 bg-gold/[0.15]"
              >
                ✓
              </div>
              <h3 className="text-xl font-bold mb-2 text-gold">
                تم إرسال رسالتك
              </h3>
              <p className="text-sm text-text-muted">
                سنتواصل معك في أقرب وقت ممكن
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6 rounded-2xl bg-bg-card border border-border"
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
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${type === opt.value ? "border-gold text-gold bg-gold/[0.08]" : "border-border text-text-muted"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-muted">
                    الاسم الكامل *
                  </label>
                  <input
                    required
                    name="name"
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors bg-bg text-text"
                    style={{ border: "1px solid #2E2A18" }}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                    onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-muted">
                    البريد الإلكتروني *
                  </label>
                  <input
                    required
                    name="email"
                    type="email"
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none bg-bg text-text"
                    style={{ border: "1px solid #2E2A18" }}
                    onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                    onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                  />
                </div>
              </div>

              {type === "guest" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-text-muted">
                    الصفة / المنصب
                  </label>
                  <input
                    name="role"
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none bg-bg text-text"
                    placeholder="مثال: وزير سابق، ناشط حقوقي..."
                    style={{ border: "1px solid #2E2A18" }}
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
                  name="subject"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none bg-bg text-text"
                  style={{ border: "1px solid #2E2A18" }}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 text-text-muted">
                  الرسالة *
                </label>
                <textarea
                  required
                  name="message"
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none resize-none bg-bg text-text"
                  style={{ border: "1px solid #2E2A18" }}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
                  onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
                />
              </div>

              {error && (
                <p className="text-xs text-center text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  background: sending ? "#2E2A18" : "linear-gradient(135deg, #C9A844, #9A7B28)",
                  color: sending ? "#9A9070" : "#111008",
                  cursor: sending ? "not-allowed" : "pointer",
                }}
              >
                {sending ? "جارٍ الإرسال..." : "إرسال الرسالة"}
              </button>
            </form>
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div className="p-5 rounded-xl bg-bg-card border border-border">
            <h3 className="font-bold text-sm mb-3 text-gold">
              للتواصل المباشر
            </h3>
            <p className="text-sm leading-relaxed text-text-muted">
              يمكنكم التواصل معنا عبر منصات التواصل الاجتماعي أو إرسال رسالة عبر النموذج أعلاه. نستقبل طلبات الضيافة والتعاون والاستفسارات الإعلامية.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-bg-card border border-border">
            <h3 className="font-bold text-sm mb-4 text-gold">
              تابعنا
            </h3>
            <div className="space-y-2">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.icon}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm text-text-muted"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#C9A844";
                    (e.currentTarget as HTMLElement).style.background = "rgba(201,168,68,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "";
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0 bg-gold" />
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
