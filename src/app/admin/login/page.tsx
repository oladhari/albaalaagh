"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/admin";
    } else {
      setError("كلمة المرور غير صحيحة");
      setLoading(false);
    }
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
            <label className="block text-sm mb-1.5" style={{ color: "#9A9070" }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: "#111008",
                border: "1px solid #2E2A18",
                color: "#F0EAD6",
              }}
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ color: "#ef4444" }}>{error}</p>
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
