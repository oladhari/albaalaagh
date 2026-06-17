import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { spawn } from "node:child_process";
import { createReadStream, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const maxDuration = 300;

const YT_DLP    = process.env.YT_DLP_PATH ?? "yt-dlp";
const PAGE_ID   = process.env.FB_PAGE2_ID!;
const PAGE_TOKEN = process.env.FB_PAGE2_TOKEN!;
const FB_API    = "https://graph.facebook.com/v19.0";

type EventType = "status" | "done" | "error";
type Emit = (type: EventType, msg: string) => void;

// ── yt-dlp helpers ────────────────────────────────────────────────────────────

function spawnYtDlp(
  args: string[],
  onStdout?: (line: string) => void,
  onStderr?: (line: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP, args, {
      env: { ...process.env, PATH: `${process.env.PATH}:/home/oladhari/.local/bin:/usr/local/bin` },
    });
    let stdout = "";
    proc.stdout.on("data", (d: Buffer) => { const t = d.toString(); stdout += t; onStdout?.(t); });
    proc.stderr.on("data", (d: Buffer) => { onStderr?.(d.toString()); });
    proc.on("close", (code) => {
      code === 0 ? resolve(stdout.trim()) : reject(new Error(`yt-dlp exited ${code}`));
    });
  });
}

async function fetchYtMeta(ytUrl: string): Promise<{ title: string; description: string }> {
  const json = await spawnYtDlp(["--dump-json", "--skip-download", "--no-playlist", ytUrl]);
  const meta = JSON.parse(json);
  return {
    title:       (meta.title as string) || "فيديو",
    description: ((meta.description as string) || "").slice(0, 4500),
  };
}

async function downloadVideo(ytUrl: string, outPath: string, emit: Emit): Promise<string> {
  let lastThreshold = -1;
  await spawnYtDlp(
    [
      "--format",
      "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]",
      "--merge-output-format", "mp4",
      "--no-warnings",
      "--newline",
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

  // yt-dlp may append .mp4 if it wasn't in the template
  for (const p of [outPath, outPath + ".mp4"]) {
    try { statSync(p); return p; } catch {}
  }
  throw new Error("لم يُعثر على الملف بعد التحميل");
}

// ── Facebook helpers ──────────────────────────────────────────────────────────

async function fbPost(endpoint: string, body: Record<string, string>): Promise<Response> {
  return fetch(`${FB_API}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function run(ytUrl: string, emit: Emit): Promise<void> {
  if (!PAGE_ID || !PAGE_TOKEN) throw new Error("بيانات صفحة فيسبوك غير مضبوطة (FB_PAGE2_ID / FB_PAGE2_TOKEN)");

  // 1 — metadata
  emit("status", "جاري استخراج معلومات الفيديو...");
  const { title, description } = await fetchYtMeta(ytUrl);
  emit("status", `العنوان: ${title}`);

  // 2 — download
  emit("status", "جاري تحميل الفيديو...");
  const tmpDir  = mkdtempSync(join(tmpdir(), "ytfb-"));
  const outPath = join(tmpDir, "video.mp4");

  try {
    const videoPath = await downloadVideo(ytUrl, outPath, emit);
    const fileSize  = statSync(videoPath).size;
    emit("status", `تم التحميل (${(fileSize / 1048576).toFixed(1)} MB)`);

    // 3 — FB Reel: start
    emit("status", "جاري تهيئة رفع الريل على فيسبوك...");
    const startRes = await fbPost(`${PAGE_ID}/video_reels`, {
      upload_phase: "start",
      access_token: PAGE_TOKEN,
    });
    if (!startRes.ok) throw new Error(`فيسبوك (start): ${(await startRes.text()).slice(0, 300)}`);
    const { video_id, upload_url } = await startRes.json() as { video_id: string; upload_url: string };

    // 4 — FB Reel: PUT file
    emit("status", "جاري رفع الفيديو إلى فيسبوك...");
    const putRes = await fetch(upload_url, {
      method: "PUT",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: createReadStream(videoPath) as any,
      headers: {
        Authorization: `OAuth ${PAGE_TOKEN}`,
        offset:        "0",
        file_size:     String(fileSize),
      },
      // @ts-expect-error — `duplex` not in TS types but required for streaming body
      duplex: "half",
    });
    if (!putRes.ok) throw new Error(`فيسبوك (upload): ${(await putRes.text()).slice(0, 300)}`);
    emit("status", "تم رفع الملف بنجاح");

    // 5 — FB Reel: finish
    emit("status", "جاري نشر الريل...");
    const finishRes = await fbPost(`${PAGE_ID}/video_reels`, {
      upload_phase: "finish",
      video_id,
      access_token: PAGE_TOKEN,
      title:        title.slice(0, 500),
      description,
      video_state:  "PUBLISHED",
    });
    if (!finishRes.ok) throw new Error(`فيسبوك (finish): ${(await finishRes.text()).slice(0, 300)}`);
    const finishData = await finishRes.json() as { success?: boolean; post_id?: string };
    const postId = finishData.post_id;
    emit("status", `تم النشر${postId ? ` — post_id: ${postId}` : ""}`);

    // 6 — comment
    if (postId) {
      emit("status", "جاري إضافة التعليق...");
      const commentRes = await fbPost(`${postId}/comments`, {
        access_token: PAGE_TOKEN,
        message: `شاهد المزيد من المحتوى على قناتنا: ${ytUrl}\nوتابعونا على موقعنا: https://www.albaalaagh.com`,
      });
      if (commentRes.ok) {
        emit("status", "تم إضافة التعليق");
      } else {
        emit("status", `تحذير: فشل إضافة التعليق — ${(await commentRes.text()).slice(0, 200)}`);
      }
    } else {
      emit("status", "تحذير: لم يُعاد post_id — تخطّي التعليق");
    }

    emit("done", "تمت المشاركة على فيسبوك بنجاح!");
  } finally {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

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
      "Content-Type":     "text/event-stream; charset=utf-8",
      "Cache-Control":    "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
