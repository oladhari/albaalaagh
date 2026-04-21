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
          border: "1px solid #2E2A18",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Cairo",
          direction: "rtl",
          position: "relative",
          overflow: "hidden",
          padding: "60px 80px",
        }}
      >
        {/* Top-right radial glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 320,
            height: 320,
            borderBottomLeftRadius: "100%",
            background: "radial-gradient(circle, rgba(201,168,68,0.12), transparent 70%)",
            display: "flex",
          }}
        />
        {/* Bottom-left radial glow */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 480,
            height: 480,
            borderTopRightRadius: "100%",
            background: "radial-gradient(circle, rgba(201,168,68,0.06), transparent 70%)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Title */}
          <div
            style={{
              fontSize: 120,
              fontWeight: 700,
              color: "#C9A844",
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}
          >
            البلاغ
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 30,
              color: "#9A9070",
              lineHeight: 1.7,
              maxWidth: 780,
            }}
          >
            منبر إعلامي تونسي مستقل يؤمن بحرية الكلمة — نُجري حوارات معمقة مع شخصيات سياسية وفكرية بارزة، ونواكب الحدث التونسي والعربي والدولي.
          </div>

          {/* Nav pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {["المقابلات", "الأخبار", "المقالات", "قضايا شرعية", "الضيوف"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "10px 26px",
                  borderRadius: 999,
                  border: "1px solid rgba(201,168,68,0.3)",
                  color: "#C9A844",
                  fontSize: 24,
                  fontWeight: 700,
                  background: "rgba(201,168,68,0.12)",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 56,
            paddingTop: 32,
            borderTop: "1px solid #2E2A18",
          }}
        >
          {[
            { value: "+5876", label: "فيديو على يوتيوب" },
            { value: "31.7K", label: "مشترك يوتيوب" },
            { value: "+17",   label: "مقال" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 38, fontWeight: 700, color: "#C9A844" }}>{stat.value}</div>
              <div style={{ fontSize: 20, color: "#9A9070", marginTop: 4 }}>{stat.label}</div>
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
