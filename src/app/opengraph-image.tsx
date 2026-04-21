import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const fontData = await readFile(
    path.join(process.cwd(), "public/fonts/Cairo-Bold.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #1A1810 0%, #111008 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Cairo",
          position: "relative",
          overflow: "hidden",
          padding: "60px 80px",
        }}
      >
        {/* Top-right radial glow */}
        <div style={{ position: "absolute", top: 0, right: 0, width: 320, height: 320, borderBottomLeftRadius: "100%", background: "radial-gradient(circle, rgba(201,168,68,0.12), transparent 70%)", display: "flex" }} />
        {/* Bottom-left radial glow */}
        <div style={{ position: "absolute", bottom: 0, left: 0, width: 480, height: 480, borderTopRightRadius: "100%", background: "radial-gradient(circle, rgba(201,168,68,0.06), transparent 70%)", display: "flex" }} />

        {/* Main content — right-aligned to match RTL */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 28 }}>

          {/* Title */}
          <div style={{ fontSize: 120, fontWeight: 700, color: "#C9A844", lineHeight: 1.1, textAlign: "right" }}>
            البلاغ
          </div>

          {/* Description — each line is nowrap to prevent Satori scrambling Arabic word order */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {[
              "منبر إعلامي تونسي مستقل يؤمن بحرية الكلمة",
              "حوارات معمّقة مع شخصيات سياسية وفكرية بارزة",
              "ومواكبة الحدث التونسي والعربي والدولي",
            ].map((line) => (
              <div key={line} style={{ fontSize: 26, color: "#9A9070", whiteSpace: "nowrap", textAlign: "right" }}>
                {line}
              </div>
            ))}
          </div>

          {/* Nav pills */}
          <div style={{ display: "flex", gap: 14, justifyContent: "flex-end" }}>
            {["الضيوف", "قضايا شرعية", "المقالات", "الأخبار", "المقابلات"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "10px 26px",
                  borderRadius: 999,
                  border: "1px solid rgba(201,168,68,0.3)",
                  color: "#C9A844",
                  fontSize: 22,
                  fontWeight: 700,
                  background: "rgba(201,168,68,0.12)",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Stats — right-aligned */}
        <div style={{ display: "flex", gap: 56, paddingTop: 32, borderTop: "1px solid #2E2A18", justifyContent: "flex-end" }}>
          {[
            { value: "+17",   label: "مقال" },
            { value: "31.7K", label: "مشترك يوتيوب" },
            { value: "+5876", label: "فيديو على يوتيوب" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#C9A844" }}>{stat.value}</div>
              <div style={{ fontSize: 18, color: "#9A9070", marginTop: 4, whiteSpace: "nowrap" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Cairo", data: fontData, weight: 700 }],
    }
  );
}
