"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";
const CONSENT_EVENT = "cookie-consent-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(CONSENT_KEY);
}

function getServerSnapshot() {
  return "pending";
}

export default function CookieBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(value: "accepted" | "rejected") {
    localStorage.setItem(CONSENT_KEY, value);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (consent !== null) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3"
      style={{ background: "#1A1810", borderTop: "1px solid #2E2A18" }}
      dir="rtl"
    >
      <p className="text-xs leading-relaxed text-center sm:text-right" style={{ color: "#9A9070" }}>
        نستخدم ملفات ارتباط اختيارية لقياس أداء الموقع عبر Google Analytics. يمكنك قبولها أو
        متابعة التصفح من دون تفعيلها. تُدار موافقات إعلانات Google، عند انطباقها، عبر رسالة
        الخصوصية المعتمدة من Google. راجع{" "}
        <Link href="/privacy-policy" className="underline" style={{ color: "#C9A844" }}>
          سياسة الخصوصية
        </Link>
        .
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => choose("rejected")}
          className="px-5 py-2 rounded-full text-xs font-bold transition-opacity hover:opacity-80"
          style={{ border: "1px solid #9A9070", color: "#F0EAD6" }}
        >
          متابعة دون تحليلات
        </button>
        <button
          onClick={() => choose("accepted")}
          className="px-5 py-2 rounded-full text-xs font-bold transition-opacity hover:opacity-80"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          قبول التحليلات
        </button>
      </div>
    </div>
  );
}
