import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

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
    fetch(`${origin}/fonts/Cairo-Bold.ttf`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null),
    img ? toDataUrl(img) : Promise.resolve(null),
  ]);

  const fontSize = title.length > 80 ? 34 : title.length > 50 ? 40 : 48;

  const imageResponse = new ImageResponse(
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
        {/* Background image — full opacity, no gradient */}
        {imgData && (
          <img
            src={imgData}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* No-image fallback: title text */}
        {!imgData && (
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
              <div style={{ width: 4, height: 20, backgroundColor: "#C9A844", borderRadius: 2 }} />
              <div style={{ color: "#C9A844", fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>
                albaalaagh.com
              </div>
            </div>
          </div>
        )}

        {/* Small watermark when image is present */}
        {imgData && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.45)",
              borderRadius: 6,
              padding: "4px 12px",
            }}
          >
            <div style={{ width: 3, height: 14, backgroundColor: "#C9A844", borderRadius: 2 }} />
            <div style={{ color: "#C9A844", fontSize: 16, fontWeight: 700 }}>
              albaalaagh.com
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: 1280,
      height: 720,
      fonts: fontData ? [{ name: "Cairo", data: fontData, weight: 700, style: "normal" }] : [],
    }
  );

  return new Response(imageResponse.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=2592000, immutable",
      "CDN-Cache-Control": "public, max-age=2592000, immutable",
      "Vercel-CDN-Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
