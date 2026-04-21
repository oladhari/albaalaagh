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
          background: "#0D0B06",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Cairo",
          position: "relative",
        }}
      >
        {/* Corner accents */}
        <div style={{ position: "absolute", top: 32, right: 32, width: 60, height: 60, borderTop: "2px solid #2E2A18", borderRight: "2px solid #2E2A18", display: "flex" }} />
        <div style={{ position: "absolute", top: 32, left: 32, width: 60, height: 60, borderTop: "2px solid #2E2A18", borderLeft: "2px solid #2E2A18", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 32, right: 32, width: 60, height: 60, borderBottom: "2px solid #2E2A18", borderRight: "2px solid #2E2A18", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 32, left: 32, width: 60, height: 60, borderBottom: "2px solid #2E2A18", borderLeft: "2px solid #2E2A18", display: "flex" }} />

        {/* Main title */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 700,
            color: "#C9A844",
            lineHeight: 1,
            letterSpacing: "-2px",
          }}
        >
          البلاغ
        </div>

        {/* Gold separator */}
        <div
          style={{
            width: 180,
            height: 2,
            background: "linear-gradient(to right, transparent, #C9A844, transparent)",
            marginTop: 24,
            marginBottom: 28,
            display: "flex",
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            color: "#9A9070",
            letterSpacing: "1px",
          }}
        >
          منبر سياسي تونسي مستقل
        </div>

        {/* URL at bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            fontSize: 22,
            color: "#3A3520",
            letterSpacing: "2px",
          }}
        >
          www.albaalaagh.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Cairo", data: fontData, weight: 700 }],
    }
  );
}
