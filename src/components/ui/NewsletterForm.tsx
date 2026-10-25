"use client";
import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail]   = useState("");
  const [state, setState]   = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p style={{ color: "var(--color-success)", fontSize: "14px", fontWeight: "600" }}>
        ✓ تم تسجيلك في النشرة البريدية
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="بريدك الإلكتروني"
        disabled={state === "loading"}
        style={{
          flex:         "1 1 180px",
          background:   "var(--color-bg)",
          border:       "1px solid var(--color-border)",
          borderRadius: "8px",
          padding:      "8px 12px",
          color:        "var(--color-gold-light)",
          fontSize:     "13px",
          outline:      "none",
          direction:    "ltr",
        }}
      />
      <button
        type="submit"
        disabled={state === "loading"}
        style={{
          background:   "linear-gradient(135deg, #C9A844, #9A7B28)",
          color:        "#111008",
          border:       "none",
          borderRadius: "8px",
          padding:      "8px 16px",
          fontSize:     "13px",
          fontWeight:   "700",
          cursor:       state === "loading" ? "wait" : "pointer",
          whiteSpace:   "nowrap",
        }}
      >
        {state === "loading" ? "..." : "اشترك"}
      </button>
      {state === "error" && (
        <p style={{ width: "100%", color: "var(--color-danger)", fontSize: "12px", margin: "4px 0 0" }}>
          حدث خطأ، حاول مجدداً
        </p>
      )}
    </form>
  );
}
