import { supabaseAdmin } from "@/lib/supabase";
import { readFileSync } from "fs";

const CLIENT_KEY    = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
export const REDIRECT_URI = "https://www.albaalaagh.com/api/admin/tiktok/callback";

// ── Token storage in site_settings ─────────────────────────────────────────

async function saveSetting(key: string, value: string) {
  await supabaseAdmin.from("site_settings").upsert({ key, value }, { onConflict: "key" });
}

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", key).single();
  return data?.value ?? null;
}

// ── OAuth helpers ────────────────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key:    CLIENT_KEY,
    scope:         "video.publish,user.info.basic",
    response_type: "code",
    redirect_uri:  REDIRECT_URI,
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}

export async function exchangeCode(code: string): Promise<void> {
  const body = new URLSearchParams({
    client_key:    CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    code,
    grant_type:    "authorization_code",
    redirect_uri:  REDIRECT_URI,
  });

  const res  = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error_description ?? "TikTok token exchange failed");

  const expiresAt = Date.now() + data.expires_in * 1000;
  await Promise.all([
    saveSetting("tiktok_access_token",      data.access_token),
    saveSetting("tiktok_refresh_token",     data.refresh_token),
    saveSetting("tiktok_open_id",           data.open_id),
    saveSetting("tiktok_token_expires_at",  String(expiresAt)),
  ]);
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getSetting("tiktok_refresh_token");
  if (!refreshToken) throw new Error("No TikTok refresh token stored");

  const body = new URLSearchParams({
    client_key:    CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    grant_type:    "refresh_token",
    refresh_token: refreshToken,
  });

  const res  = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error_description ?? "TikTok token refresh failed");

  const expiresAt = Date.now() + data.expires_in * 1000;
  await Promise.all([
    saveSetting("tiktok_access_token",     data.access_token),
    saveSetting("tiktok_token_expires_at", String(expiresAt)),
    ...(data.refresh_token ? [saveSetting("tiktok_refresh_token", data.refresh_token)] : []),
  ]);

  return data.access_token;
}

export async function getAccessToken(): Promise<string> {
  const [token, expiresAtStr] = await Promise.all([
    getSetting("tiktok_access_token"),
    getSetting("tiktok_token_expires_at"),
  ]);
  if (!token) throw new Error("TikTok not connected — visit /admin/tiktok to authorize");

  // Refresh if expiring in less than 5 minutes
  const expiresAt = parseInt(expiresAtStr ?? "0", 10);
  if (Date.now() > expiresAt - 5 * 60 * 1000) {
    return refreshAccessToken();
  }
  return token;
}

export async function isConnected(): Promise<boolean> {
  const token = await getSetting("tiktok_access_token");
  return !!token;
}

// ── Video posting ────────────────────────────────────────────────────────────

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB per chunk

export async function postVideoToTikTok({
  videoPath,
  title,
}: {
  videoPath: string;
  title:     string;
}): Promise<string> {
  const accessToken = await getAccessToken();
  const fileBuffer  = readFileSync(videoPath);
  const fileSize    = fileBuffer.byteLength;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  // 1. Initialize upload
  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title:                     title.slice(0, 2200),
        privacy_level:             "PUBLIC_TO_EVERYONE",
        disable_duet:              false,
        disable_comment:           false,
        disable_stitch:            false,
        video_cover_timestamp_ms:  1000,
      },
      source_info: {
        source:            "FILE_UPLOAD",
        video_size:        fileSize,
        chunk_size:        Math.min(CHUNK_SIZE, fileSize),
        total_chunk_count: totalChunks,
      },
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok || initData.error?.code !== "ok") {
    throw new Error(`TikTok init failed: ${JSON.stringify(initData.error ?? initData)}`);
  }

  const { publish_id, upload_url } = initData.data;

  // 2. Upload chunks
  for (let i = 0; i < totalChunks; i++) {
    const start  = i * CHUNK_SIZE;
    const end    = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk  = fileBuffer.subarray(start, end);

    const uploadRes = await fetch(upload_url, {
      method:  "PUT",
      headers: {
        "Content-Range":  `bytes ${start}-${end - 1}/${fileSize}`,
        "Content-Length": String(chunk.byteLength),
        "Content-Type":   "video/mp4",
      },
      body: chunk,
    });

    if (!uploadRes.ok) {
      throw new Error(`TikTok chunk ${i + 1}/${totalChunks} upload failed: ${uploadRes.status}`);
    }
  }

  return publish_id;
}
