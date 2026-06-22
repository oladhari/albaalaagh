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
): Promise<{ title: string; description: string }> {
  // Use YouTube Data API v3 — no bot-check, fast, already have the key
  const apiKey = process.env.YOUTUBE_API_KEY;
  const videoId = extractVideoId(ytUrl);
  if (apiKey && videoId) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
    );
    if (res.ok) {
      const data = await res.json() as { items?: { snippet: { title: string; description: string } }[] };
      const snippet = data.items?.[0]?.snippet;
      if (snippet) {
        return {
          title:       snippet.title || "فيديو",
          description: (snippet.description || "").slice(0, 4500),
        };
      }
    }
  }
  throw new Error("تعذّر جلب معلومات الفيديو من يوتيوب — تحقق من YOUTUBE_API_KEY");
}

async function downloadVideo(
  bin: string,
  ytUrl: string,
  outPath: string,
  emit: Emit,
): Promise<string> {
  let lastThreshold = -1;
  await spawnYtDlp(
    bin,
    [
      "--format",
      "best[height<=1080][ext=mp4]/best[ext=mp4]/best[height<=1080]/best",
      "--extractor-args", "youtube:player_client=web,android_vr",
      "--no-warnings",
      "--newline",
      ...cookiesArg(),
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

async function run(ytUrl: string, emit: Emit): Promise<void> {
  if (!PAGE_ID || !PAGE_TOKEN)
    throw new Error("بيانات صفحة فيسبوك غير مضبوطة (FB_PAGE2_ID / FB_PAGE2_TOKEN)");

  emit("status", "جاري التحقق من أدوات التحميل...");
  const bin = await resolveYtDlp();

  emit("status", "جاري استخراج معلومات الفيديو...");
  const { title, description } = await fetchYtMeta(ytUrl);
  emit("status", `العنوان: ${title}`);

  emit("status", "جاري تحميل الفيديو...");
  const tmpDir  = mkdtempSync(join(tmpdir(), "ytfb-"));
  const outPath = join(tmpDir, "video.mp4");

  try {
    const videoPath = await downloadVideo(bin, ytUrl, outPath, emit);
    const fileSize  = statSync(videoPath).size;
    emit("status", `تم التحميل (${(fileSize / 1048576).toFixed(1)} MB)`);

    emit("status", "جاري رفع الفيديو إلى فيسبوك...");
    const fileBuffer = readFileSync(videoPath);
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
    emit("status", "تم رفع الفيديو على فيسبوك بنجاح");

    if (videoId) {
      emit("status", "جاري إضافة التعليق...");
      const commentRes = await fbPost(`${videoId}/comments`, {
        access_token: PAGE_TOKEN,
        message: `شاهد المزيد من المحتوى على قناتنا: ${ytUrl}\nوتابعونا على موقعنا: https://www.albaalaagh.com`,
      });
      if (commentRes.ok) {
        emit("status", "تم إضافة التعليق على فيسبوك");
      } else {
        emit("status", `تحذير: فشل إضافة التعليق — ${(await commentRes.text()).slice(0, 200)}`);
      }
    }

    // ── TikTok ──────────────────────────────────────────────────────────────
    const ttConnected = await tiktokConnected();
    if (ttConnected) {
      emit("status", "جاري رفع الفيديو إلى TikTok...");
      try {
        const publishId = await postVideoToTikTok({ videoPath, title });
        emit("status", `تم إرسال الفيديو إلى TikTok (publish_id: ${publishId})`);
      } catch (ttErr: any) {
        emit("status", `تحذير TikTok: ${ttErr.message ?? ttErr}`);
      }
    } else {
      emit("status", "TikTok غير مرتبط — تخطي (ربط الحساب من /admin/tiktok)");
    }

    emit("done", "تمت المشاركة على فيسبوك" + (ttConnected ? " و TikTok" : "") + " بنجاح!");
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

export async function GET(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const ytUrl = req.nextUrl.searchParams.get("url") ?? "";
  let parsed: URL;
  try { parsed = new URL(ytUrl); } catch {
    return new Response("رابط غير صالح", { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new Response("بروتوكول غير مسموح به", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (type, msg) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, msg })}\n\n`));
      };
      try {
        await run(ytUrl, emit);
      } catch (err: unknown) {
        emit("error", err instanceof Error ? err.message : String(err));
      } finally {
        controller.close();
      }
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
