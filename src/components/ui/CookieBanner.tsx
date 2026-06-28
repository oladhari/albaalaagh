"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
      style={{ background: "#1A1810", borderTop: "1px solid #2E2A18" }}
      dir="rtl"
    >
      <p className="text-xs leading-relaxed text-center sm:text-right" style={{ color: "#9A9070" }}>
        يستخدم هذا الموقع ملفات الارتباط (Cookies) لتحسين تجربتك وعرض الإعلانات المناسبة.
        باستمرار تصفحك فأنت توافق على{" "}
        <Link href="/privacy-policy" className="underline" style={{ color: "#C9A844" }}>
          سياسة الخصوصية
        </Link>
        .
      </p>
      <button
        onClick={accept}
        className="shrink-0 px-5 py-2 rounded-full text-xs font-bold transition-opacity hover:opacity-80"
        style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
      >
        موافق
      </button>
    </div>
  );
}
