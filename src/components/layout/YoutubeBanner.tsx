"use client";
import { useState } from "react";

export default function YoutubeBanner() {
  const [closed, setClosed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (closed) return null;

  return (
    <div
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, #0d1a0d, #0f2010)",
        borderBottom: "1px solid #1a5c1a",
        padding: "14px 20px",
        position: "relative",
        fontFamily: "Cairo, sans-serif",
      }}
    >
      <button
        onClick={() => setClosed(true)}
        aria-label="إغلاق"
        style={{
          position: "absolute",
          left: "16px",
          top: "16px",
          background: "none",
          border: "none",
          color: "#aaa",
          fontSize: "18px",
          cursor: "pointer",
          lineHeight: 1,
          padding: "4px",
        }}
      >
        ✕
      </button>

      <div style={{ maxWidth: "860px", margin: "0 auto", paddingLeft: "32px" }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "20px" }}>📢</span>
          <span style={{ color: "#4ade80", fontWeight: "800", fontSize: "15px" }}>
            تحديث هام حول مستقبل البلاغ الرقمية
          </span>
        </div>

        {/* Summary */}
        <p style={{ color: "#D4C5A9", fontSize: "13.5px", lineHeight: "1.9", margin: "0 0 8px" }}>
          بعد رفض الطعن على قرار إغلاق قناة البلاغ على يوتيوب، قررنا أن يصبح موقع{" "}
          <strong style={{ color: "#F0EAD6" }}>albaalaagh.com</strong> المنصة الرئيسية للمشروع.
          سنرفع تدريجياً جميع الحلقات والبثوث المباشرة والسلاسل الكاملة على الموقع — أكثر من{" "}
          <strong style={{ color: "#4ade80" }}>2700 فيديو</strong>.
          {" "}سنواصل البث عبر:{" "}
          {[
            { label: "فيسبوك", href: "https://www.facebook.com/albaalaagh" },
            { label: "X", href: "https://x.com/albaalaagh" },
            { label: "Twitch", href: "https://www.twitch.tv/albaalaagh" },
            { label: "Kick", href: "https://kick.com/albaalaagh" },
          ].map(({ label, href }, i, arr) => (
            <span key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4ade80", textDecoration: "underline", fontWeight: "600" }}
              >
                {label}
              </a>
              {i < arr.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>

        {/* Expanded content */}
        {expanded && (
          <div style={{ color: "#C4B89A", fontSize: "13px", lineHeight: "1.9", marginBottom: "10px" }}>
            <p style={{ margin: "0 0 6px" }}>
              وبعد كل بث مباشر سيُنشر على الموقع مباشرة. كما نعمل على حل مستقل للبث عبر الموقع حتى لا نبقى مرتبطين بأي منصة خارجية.
            </p>
            <p style={{ margin: "0 0 6px" }}>
              خلال المرحلة الانتقالية، ستُبثّ بعض البرامج عبر{" "}
              <a
                href="https://www.youtube.com/@chokrimajouli"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4ade80", textDecoration: "underline" }}
              >
                قناة الدكتور شكري مجولي على يوتيوب
              </a>.
            </p>
            <p style={{ margin: "0 0 6px" }}>
              <strong style={{ color: "#F0EAD6" }}>البرامج القادمة:</strong>{" "}
              المسافة صفر (الخميس) · الشريعة والسياسة (الجمعة) · على الطاولة (السبت) · منبر الأحد (الأحد) · اليوم التالي (الأربعاء)
            </p>
            <p style={{ margin: "0", color: "#9A9070", fontSize: "12.5px" }}>
              إغلاق قناة يوتيوب لن يكون نهاية البلاغ — سنواصل العمل بإذن الله.
            </p>
          </div>
        )}

        {/* Toggle + support link */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: "none",
              border: "none",
              color: "#4ade80",
              fontSize: "12.5px",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {expanded ? "إخفاء التفاصيل ▲" : "قراءة البيان كاملاً ▼"}
          </button>
          <a
            href="/support"
            style={{
              background: "rgba(74,222,128,0.12)",
              border: "1px solid rgba(74,222,128,0.35)",
              color: "#4ade80",
              padding: "3px 14px",
              borderRadius: "20px",
              fontSize: "12.5px",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            ادعم البلاغ →
          </a>
        </div>
      </div>
    </div>
  );
}
