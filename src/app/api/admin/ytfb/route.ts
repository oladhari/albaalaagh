import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { spawn } from "node:child_process";
import {
  readFileSync, statSync, mkdtempSync, rmSync,
  existsSync, writeFileSync, chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { postVideoToTikTok, isConnected as tiktokConnected } from "@/lib/tiktok";
import { uploadToR2 } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase";

function cookiesArg(): string[] {
  // Local dev: point directly to the exported cookies file
  const file = process.env.YOUTUBE_COOKIES_FILE;
  if (file && existsSync(file)) return ["--cookies", file];

  // Production: cookies content stored in env var
  const cookies = process.env.YOUTUBE_COOKIES;
  if (!cookies) return [];
  writeFileSync("/tmp/yt-cookies.txt", cookies);
  return ["--cookies", "/tmp/yt-cookies.txt"];
}

export const maxDuration = 300;

const PAGE_ID    = process.env.FB_PAGE2_ID!;
const PAGE_TOKEN = process.env.FB_PAGE2_TOKEN!;
const FB_API     = "https://graph.facebook.com/v19.0";

type EventType = "status" | "done" | "error";
type Emit = (type: EventType, msg: string) => void;

let _ytDlpBin: string | null = null;

async function resolveYtDlp(): Promise<string> {
  if (_ytDlpBin) return _ytDlpBin;

  // 1. Explicit env override
  if (process.env.YT_DLP_PATH) {
    _ytDlpBin = process.env.YT_DLP_PATH;
    return _ytDlpBin;
  }

  // 2. Check common local paths
  for (const p of [
    "/home/oladhari/.local/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
  ]) {
    if (existsSync(p)) { _ytDlpBin = p; return p; }
  }

  // 3. Check if "yt-dlp" is on PATH
  try {
    await new Promise<void>((res, rej) => {
      const p = spawn("yt-dlp", ["--version"]);
      p.on("close", (c) => (c === 0 ? res() : rej(new Error(`exit ${c}`))));
      p.on("error", rej);
    });
    _ytDlpBin = "yt-dlp";
    return "yt-dlp";
  } catch {}

  // 4. Download standalone Linux binary to /tmp (works on Vercel)
  const bin = "/tmp/yt-dlp";
  if (!existsSync(bin)) {
    const r = await fetch(
      "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux",
    );
    if (!r.ok) throw new Error("تعذّر تنزيل أداة yt-dlp من GitHub");
    writeFileSync(bin, Buffer.from(await r.arrayBuffer()));
    chmodSync(bin, 0o755);
  }
  _ytDlpBin = bin;
  return bin;
}

function spawnYtDlp(
  bin: string,
  args: string[],
  onStdout?: (chunk: string) => void,
  onStderr?: (chunk: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { const t = d.toString(); stdout += t; onStdout?.(t); });
    proc.stderr.on("data", (d: Buffer) => { const t = d.toString(); stderr += t; onStderr?.(t); });
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0
        ? resolve(stdout.trim())
        : reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-400)}`)),
    );
  });
}

function extractVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

async function fetchYtMeta(
  ytUrl: string,
): Promise<{ title: string; description: string; thumbnailUrl: string | null; videoId: string }> {
  // Use YouTube Data API v3 — no bot-check, fast, already have the key
  const apiKey = process.env.YOUTUBE_API_KEY;
  const videoId = extractVideoId(ytUrl);
  if (!videoId) throw new Error("تعذّر استخراج معرّف الفيديو من الرابط");
  if (apiKey) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
    );
    if (res.ok) {
      const data = await res.json() as {
        items?: { snippet: { title: string; description: string; thumbnails?: Record<string, { url: string }> } }[];
      };
      const snippet = data.items?.[0]?.snippet;
      if (snippet) {
        const t = snippet.thumbnails ?? {};
        return {
          title:        snippet.title || "فيديو",
          description:  (snippet.description || "").slice(0, 4500),
          thumbnailUrl: t.maxres?.url ?? t.high?.url ?? t.medium?.url ?? t.default?.url ?? null,
          videoId,
        };
      }
    }
  }
  throw new Error("تعذّر جلب معلومات الفيديو من يوتيوب — تحقق من YOUTUBE_API_KEY");
}

async function attemptDownload(
  bin: string,
  ytUrl: string,
  outPath: string,
  extraArgs: string[],
  emit: Emit,
): Promise<void> {
  let lastThreshold = -1;
  await spawnYtDlp(
    bin,
    [
      "--format",
      "best[height<=1080][ext=mp4]/best[ext=mp4]/best[height<=1080]/best",
      "--extractor-args", "youtube:player_client=web,android_vr",
      "--remote-components", "ejs:github",
      "--no-warnings",
      "--newline",
      ...cookiesArg(),
      ...extraArgs,
      "-o", outPath,
      ytUrl,
    ],
    undefined,
    (line) => {
      const m = line.match(/(\d+\.?\d*)%/);
      if (m) {
        const pct = parseFloat(m[1]);
        const threshold = Math.floor(pct / 25) * 25;
        if (threshold > lastThreshold && threshold >= 25) {
          lastThreshold = threshold;
          emit("status", `جاري التحميل: ${threshold}%`);
        }
      }
    },
  );
}

const DENO_BIN = "/home/oladhari/.deno/bin/deno";

async function downloadVideo(
  bin: string,
  ytUrl: string,
  outPath: string,
  emit: Emit,
): Promise<string> {
  const retryDelaysMs = [30_000, 90_000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      await attemptDownload(bin, ytUrl, outPath, [], emit);
      lastErr = undefined;
      break;
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!/403|Forbidden/.test(msg) || attempt >= retryDelaysMs.length) break;
      const waitMs = retryDelaysMs[attempt];
      emit("status", `تحذير: حُظر التحميل مؤقتاً (403) — إعادة المحاولة بعد ${Math.round(waitMs / 1000)} ثانية...`);
      await sleep(waitMs);
    }
  }

  if (lastErr) {
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    if (!/403|Forbidden/.test(msg) || !existsSync(DENO_BIN)) throw lastErr;
    emit("status", "تحذير: التحميل ما زال محظوراً — إعادة المحاولة عبر تسجيل دخول المتصفح...");
    await attemptDownload(bin, ytUrl, outPath, [
      "--cookies-from-browser", "chrome",
      "--js-runtimes", `deno:${DENO_BIN}`,
    ], emit);
  }

  for (const ext of ["", ".mp4", ".webm", ".mkv"]) {
    try { statSync(outPath + ext); return outPath + ext; } catch {}
  }
  throw new Error("لم يُعثر على الملف بعد التحميل");
}

async function fbPost(endpoint: string, body: Record<string, string>): Promise<Response> {
  return fetch(`${FB_API}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
}

async function addComment(videoId: string, ytUrl: string, emit: Emit, label: string): Promise<void> {
  const commentRes = await fbPost(`${videoId}/comments`, {
    access_token: PAGE_TOKEN,
    message: `شاهد المزيد من المحتوى على قناتنا: ${ytUrl}\nوتابعونا على موقعنا: https://www.albaalaagh.com`,
  });
  if (commentRes.ok) {
    emit("status", `تم إضافة التعليق على ${label}`);
  } else {
    emit("status", `تحذير: فشل إضافة التعليق على ${label} — ${(await commentRes.text()).slice(0, 200)}`);
  }
}

async function publishFacebookVideo(
  fileBuffer: Buffer<ArrayBuffer>,
  title: string,
  description: string,
  ytUrl: string,
  emit: Emit,
): Promise<void> {
  emit("status", "جاري رفع الفيديو إلى فيسبوك (منشور عادي)...");
  const form = new FormData();
  form.append("access_token", PAGE_TOKEN);
  form.append("title", title.slice(0, 500));
  form.append("description", description);
  form.append("source", new Blob([fileBuffer], { type: "video/mp4" }), "video.mp4");

  const uploadRes = await fetch(`https://graph-video.facebook.com/v19.0/${PAGE_ID}/videos`, {
    method: "POST",
    body: form,
  });
  if (!uploadRes.ok) {
    const t = (await uploadRes.text()).slice(0, 300);
    throw new Error(`فيسبوك HTTP ${uploadRes.status}: ${t || "(no body)"}`);
  }
  const { id: videoId } = await uploadRes.json() as { id: string };
  emit("status", "تم رفع الفيديو على فيسبوك بنجاح (منشور عادي)");

  if (videoId) {
    emit("status", "جاري إضافة التعليق (منشور عادي)...");
    await addComment(videoId, ytUrl, emit, "المنشور العادي");
  }
}

async function uploadReelBinary(
  videoId: string,
  fileBuffer: Buffer<ArrayBuffer>,
  emit: Emit,
): Promise<void> {
  const doUpload = (url: string): Promise<Response> =>
    fetch(url, {
      method:   "POST",
      redirect: "manual",
      headers: {
        Authorization:  `OAuth ${PAGE_TOKEN}`,
        offset:         "0",
        file_size:      String(fileBuffer.byteLength),
        "Content-Type": "application/octet-stream",
      },
      body: fileBuffer,
    });

  let res = await doUpload(`https://rupload.facebook.com/video-upload/v19.0/${videoId}`);
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) throw new Error(`إعادة توجيه بدون location — HTTP ${res.status}`);
    emit("status", "جاري إعادة التوجيه لتحميل الريل...");
    res = await doUpload(location);
  }
  if (!res.ok) {
    throw new Error(`فشل تحميل الريل — HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function publishFacebookReel(
  fileBuffer: Buffer<ArrayBuffer>,
  description: string,
  ytUrl: string,
  emit: Emit,
): Promise<void> {
  emit("status", "جاري بدء نشر الريل على فيسبوك...");
  const startRes = await fbPost(`${PAGE_ID}/video_reels`, {
    upload_phase:  "start",
    access_token:  PAGE_TOKEN,
  });
  if (!startRes.ok) {
    throw new Error(`فشل بدء الريل — ${(await startRes.text()).slice(0, 300)}`);
  }
  const { video_id: videoId } = await startRes.json() as { video_id: string };
  if (!videoId) throw new Error("لم يتم استلام video_id من فيسبوك");

  emit("status", "جاري تحميل الريل (رفع مباشر)...");
  await uploadReelBinary(videoId, fileBuffer, emit);

  emit("status", "جاري نشر الريل...");
  const finishRes = await fbPost(`${PAGE_ID}/video_reels`, {
    access_token:  PAGE_TOKEN,
    video_id:      videoId,
    upload_phase:  "finish",
    video_state:   "PUBLISHED",
    description:   description.slice(0, 2000),
  });
  if (!finishRes.ok) {
    throw new Error(`فشل نشر الريل — ${(await finishRes.text()).slice(0, 300)}`);
  }
  emit("status", "تم نشر الريل على فيسبوك بنجاح");

  emit("status", "جاري إضافة التعليق (ريل)...");
  await addComment(videoId, ytUrl, emit, "الريل");
}

async function runOne(ytUrl: string, emit: Emit, reelOnly = true): Promise<void> {
  const bin = await resolveYtDlp();

  emit("status", "جاري استخراج معلومات الفيديو...");
  const { title, description, thumbnailUrl, videoId: ytVideoId } = await fetchYtMeta(ytUrl);
  emit("status", `العنوان: ${title}`);

  emit("status", "جاري تحميل الفيديو...");
  const tmpDir  = mkdtempSync(join(tmpdir(), "ytfb-"));
  const outPath = join(tmpDir, "video.mp4");

  try {
    const videoPath = await downloadVideo(bin, ytUrl, outPath, emit);
    const fileSize  = statSync(videoPath).size;
    emit("status", `تم التحميل (${(fileSize / 1048576).toFixed(1)} MB)`);

    const fileBuffer = readFileSync(videoPath);

    emit("status", "جاري رفع الفيديو إلى R2...");
    const r2Key = `shorts/${ytVideoId}-${Date.now().toString(36)}.mp4`;
    const r2Url = await uploadToR2(r2Key, fileBuffer, "video/mp4");
    emit("status", "تم الرفع إلى R2");

    // ── Facebook: regular video post (skipped by default — Reel only) ───────
    if (!reelOnly) {
      try {
        await publishFacebookVideo(fileBuffer, title, description, ytUrl, emit);
      } catch (err: unknown) {
        emit("status", `تحذير: فشل المنشور العادي على فيسبوك — ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ── Facebook: Reel ────────────────────────────────────────────────────
    try {
      await publishFacebookReel(fileBuffer, description, ytUrl, emit);
    } catch (err: unknown) {
      emit("status", `تحذير: فشل نشر الريل على فيسبوك — ${err instanceof Error ? err.message : String(err)}`);
    }

    // ── TikTok ────────────────────────────────────────────────────────────
    const ttConnected = await tiktokConnected();
    if (ttConnected) {
      emit("status", "جاري رفع الفيديو إلى TikTok...");
      try {
        const publishId = await postVideoToTikTok({ videoPath, title });
        emit("status", `تم إرسال الفيديو إلى TikTok (publish_id: ${publishId})`);
      } catch (ttErr: unknown) {
        emit("status", `تحذير TikTok: ${ttErr instanceof Error ? ttErr.message : String(ttErr)}`);
      }
    } else {
      emit("status", "TikTok غير مرتبط — تخطي (ربط الحساب من /admin/tiktok)");
    }

    // ── Website /shorts ───────────────────────────────────────────────────
    emit("status", "جاري إضافة المقطع إلى موقع البلاغ...");
    const { error: dbError } = await supabaseAdmin.from("site_videos").insert({
      title,
      description:   description || null,
      video_url:     r2Url,
      thumbnail_url: thumbnailUrl,
      display_order: 0,
      published:     true,
      published_at:  new Date().toISOString(),
      video_type:    "short",
      hashtags:      null,
    });
    if (dbError) {
      emit("status", `تحذير: فشلت إضافة المقطع إلى الموقع — ${dbError.message}`);
    } else {
      emit("status", "تمت إضافة المقطع إلى /shorts على الموقع");
    }
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\r\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  if (!PAGE_ID || !PAGE_TOKEN) {
    return new Response("بيانات صفحة فيسبوك غير مضبوطة (FB_PAGE2_ID / FB_PAGE2_TOKEN)", { status: 500 });
  }

  const raw      = req.nextUrl.searchParams.get("urls") ?? req.nextUrl.searchParams.get("url") ?? "";
  const reelOnly = req.nextUrl.searchParams.get("mode") !== "full";
  const urls = parseUrls(raw).filter((u) => {
    try {
      const p = new URL(u);
      return ["http:", "https:"].includes(p.protocol);
    } catch { return false; }
  });

  if (urls.length === 0) {
    return new Response("لا توجد روابط صالحة", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (type, msg) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, msg })}\n\n`));
      };

      let succeeded = 0;
      let failed    = 0;

      for (let i = 0; i < urls.length; i++) {
        const ytUrl = urls[i];
        emit("status", `── فيديو ${i + 1}/${urls.length}: ${ytUrl} ──`);
        try {
          await runOne(ytUrl, emit, reelOnly);
          succeeded++;
        } catch (err: unknown) {
          failed++;
          emit("status", `❌ فشل هذا الفيديو — ${err instanceof Error ? err.message : String(err)}`);
        }

        const isLast = i === urls.length - 1;
        if (!isLast) {
          const doneCount = i + 1;
          const isCheckpoint = doneCount % 5 === 0;
          const waitMs = isCheckpoint ? 5 * 60_000 : 60_000;
          emit(
            "status",
            isCheckpoint
              ? "⏸️ انتظار 5 دقائق (كل 5 فيديوهات) لتفادي حظر فيسبوك..."
              : "⏸️ انتظار دقيقة واحدة قبل الفيديو التالي لتفادي حظر فيسبوك...",
          );
          await sleep(waitMs);
        }
      }

      emit("done", `اكتمل: ${succeeded} نجح${failed ? `، ${failed} فشل` : ""} من أصل ${urls.length}`);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream; charset=utf-8",
      "Cache-Control":     "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
