import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const img   = searchParams.get("img")   ?? "";

  let fontData: ArrayBuffer | null = null;
  try {
    const r = await fetch(`${origin}/fonts/Cairo-Bold.woff2`);
    if (r.ok) fontData = await r.arrayBuffer();
  } catch {
    // font unavailable — render without custom font
  }

  const fontSize = title.length > 80 ? 34 : title.length > 50 ? 40 : 48;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          backgroundColor: "#111008",
          fontFamily: "Cairo",
        }}
      >
        {/* Background image */}
        {img && (
          <img
            src={img}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.55,
            }}
          />
        )}

        {/* Gradient overlay — dark at bottom */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(17,16,8,0.15) 0%, rgba(17,16,8,0.6) 40%, rgba(17,16,8,0.97) 75%)",
            display: "flex",
          }}
        />

        {/* Text block pinned to bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0 64px 48px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          {/* Headline */}
          <div
            style={{
              color: "#F0EAD6",
              fontSize,
              fontWeight: 700,
              lineHeight: 1.55,
              textAlign: "right",
              direction: "rtl",
            }}
          >
            {title}
          </div>

          {/* Brand watermark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 4,
                height: 20,
                backgroundColor: "#C9A844",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                color: "#C9A844",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              albaalaagh.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1280,
      height: 720,
      fonts: fontData ? [{ name: "Cairo", data: fontData, weight: 700, style: "normal" }] : [],
    }
  );
}
