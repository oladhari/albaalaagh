"use client";

import { useState } from "react";

const inputClass = "w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#C9A844]";
const inputStyle = { background: "#111008", border: "1px solid #2E2A18", color: "#F0EAD6" };

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.assign("/admin");
        return;
      }
      const { error: message } = await res.json();
      setError(message || "خدمة تسجيل الدخول غير متاحة حالياً");
    } catch {
      setError("تعذّر الاتصال بخدمة تسجيل الدخول. حاول مجدداً.");
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111008",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <div
        style={{
          background: "#1A1810",
          border: "1px solid #2E2A18",
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "380px",
        }}
      >
        <h1
          className="text-2xl font-black text-center mb-8"
          style={{
            background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          لوحة الإدارة
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div>
            <label htmlFor="admin-email" className="block text-sm mb-1.5" style={{ color: "#9A9070" }}>
              البريد الإلكتروني
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm mb-1.5" style={{ color: "#9A9070" }}>
              كلمة المرور
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-center" style={{ color: "#ef4444" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-bold transition-opacity"
            style={{
              background: "linear-gradient(135deg, #C9A844, #9A7B28)",
              color: "#111008",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "جاري التحقق..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
