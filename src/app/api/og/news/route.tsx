import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Pre-fetch the image and return a data URL so Satori never hits Cloudflare directly.
// Uses only Web APIs (fetch, btoa, Uint8Array) — compatible with edge runtime.
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const ct  = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...(bytes.subarray(i, i + chunk) as unknown as number[]));
    }
    return `data:${ct};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const title = searchParams.get("title") ?? "";
  const img   = searchParams.get("img")   ?? "";

  const [fontData, imgData] = await Promise.all([
    fetch(`${origin}/fonts/Cairo-Bold.woff2`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null),
    img ? toDataUrl(img) : Promise.resolve(null),
  ]);

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
        {/* Background image as data URL — Satori never fetches Cloudflare */}
        {imgData && (
          <img
            src={imgData}
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
