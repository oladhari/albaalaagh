"use client";
import { useState } from "react";

export default function YoutubeBanner() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <div
      dir="rtl"
      style={{
        background: "linear-gradient(135deg, #1a0a0a, #2d1010)",
        borderBottom: "1px solid #8B1A1A",
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
          top: "50%",
          transform: "translateY(-50%)",
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
        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px" }}>📢</span>
          <span style={{ color: "#FF6B6B", fontWeight: "800", fontSize: "15px" }}>
            إشعار عاجل — إغلاق قناة البلاغ على يوتيوب
          </span>
        </div>

        {/* Message */}
        <p style={{ color: "#D4C5A9", fontSize: "13.5px", lineHeight: "1.8", margin: "0 0 8px" }}>
          تم إغلاق قناة <strong style={{ color: "#F0EAD6" }}>البلاغ</strong> على يوتيوب بشكل نهائي إثر سلسلة من حذف المقاطع والبثوث المباشرة المتعلقة بالقضية الفلسطينية.
          سنقوم بالطعن في هذا القرار. في الأثناء، تابعونا على المنصات البديلة:
        </p>

        {/* Alternative platforms */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            { label: "فيسبوك", href: "https://www.facebook.com/albaalaagh" },
            { label: "X / تويتر", href: "https://x.com/albaalaagh" },
            { label: "Twitch", href: "https://www.twitch.tv/albaalaagh" },
            { label: "Kick", href: "https://kick.com/albaalaagh" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "rgba(255,107,107,0.12)",
                border: "1px solid rgba(255,107,107,0.3)",
                color: "#FF9999",
                padding: "3px 12px",
                borderRadius: "20px",
                fontSize: "12.5px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              {label}
            </a>
          ))}
          <span style={{ color: "#9A9070", fontSize: "12.5px", alignSelf: "center" }}>
            والبث المباشر قريباً على موقعنا
          </span>
        </div>
      </div>
    </div>
  );
}
