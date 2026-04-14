"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

export default function WriterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
    } else {
      router.push("/writer");
      router.refresh();
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    background: "#111008",
    border: "1px solid #2E2A18",
    color: "#F0EAD6",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#111008" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-black mb-1"
            style={{
              background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            البلاغ
          </h1>
          <p className="text-sm" style={{ color: "#9A9070" }}>منصة الكتّاب</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="p-6 rounded-2xl space-y-4"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <h2 className="text-lg font-bold mb-2" style={{ color: "#F0EAD6" }}>
            تسجيل الدخول
          </h2>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9070" }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#9A9070" }}>
              كلمة المرور
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#C9A844")}
              onBlur={(e) => (e.target.style.borderColor = "#2E2A18")}
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "#FF6B6B" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all"
            style={{
              background: loading ? "#2E2A18" : "linear-gradient(135deg, #C9A844, #9A7B28)",
              color: loading ? "#9A9070" : "#111008",
            }}
          >
            {loading ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
