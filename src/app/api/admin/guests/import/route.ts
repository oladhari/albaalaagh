import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchAllVideosWithDescriptions } from "@/lib/youtube";

export const maxDuration = 300; // 5 min — requires Vercel Pro; Hobby gets 60s

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ExtractedGuest {
  name: string;
  title: string;
  category: string;
}

function normalizeArabicName(name: string): string {
  return name
    .replace(/^(الدكتور|الأستاذ|الشيخ|السيد|المحامي|الأستاذة|الدكتورة|السيدة)\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractGuestsFromBatch(
  videos: { youtube_id: string; title: string; description: string }[]
): Promise<ExtractedGuest[]> {
  const numbered = videos
    .map((v, i) => `${i}. "${v.title}" | ${v.description.slice(0, 150).replace(/\n/g, " ")}`)
    .join("\n");

  const prompt = `استخرج الضيوف من هذه المقابلات لقناة "البلاغ" التونسية.
لكل فيديو: اسم الضيف (بدون ألقاب)، صفته، تصنيفه (وزير|برلماني|ناشط|مفكر|صحفي|أكاديمي|آخر).
إذا لا يوجد ضيف واضح أعد [].
JSON فقط، مصفوفة بنفس عدد الفيديوهات (${videos.length}):
[[{"name":"...","title":"...","category":"..."}],[],...]\n\n${numbered}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";

    // Extract the outermost JSON array robustly
    const start = text.indexOf("[");
    const end   = text.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return [];

    const parsed: ExtractedGuest[][] = JSON.parse(text.slice(start, end + 1));
    return parsed.flat().filter((g) => g?.name && g.name.length > 2);
  } catch (err) {
    console.error("[guests/import] Haiku error:", err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  // offset lets the client run import in chunks (e.g. ?offset=0, ?offset=100)
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit  = 80; // videos per run — safe within 60s even on Hobby plan

  const results = {
    fetched: 0, processed: 0, extracted: 0,
    inserted: 0, updated: 0, skipped: 0,
    hasMore: false, nextOffset: 0,
    errors: [] as string[],
  };

  try {
    // 1. Fetch all live stream videos
    const allVideos = await fetchAllVideosWithDescriptions();
    results.fetched = allVideos.length;

    const chunk = allVideos.slice(offset, offset + limit);
    results.processed = chunk.length;
    results.hasMore = offset + limit < allVideos.length;
    results.nextOffset = offset + limit;

    if (chunk.length === 0) {
      return NextResponse.json({ ...results, message: "No videos in this chunk" });
    }

    // 2. Load existing guests (name + title) for dedup + update logic
    const { data: existingGuests, error: dbErr } = await supabaseAdmin
      .from("guests")
      .select("id, name, title");
    if (dbErr) throw new Error(`DB read error: ${dbErr.message}`);

    const existingMap = new Map<string, { id: string; title: string }>();
    for (const g of existingGuests ?? []) {
      existingMap.set(normalizeArabicName(g.name), { id: g.id, title: g.title ?? "" });
    }

    // 3. Batch Haiku extraction (10 videos per call — keeps prompt short)
    const BATCH = 10;
    const allExtracted: ExtractedGuest[] = [];

    for (let i = 0; i < chunk.length; i += BATCH) {
      const batch = chunk.slice(i, i + BATCH);
      const guests = await extractGuestsFromBatch(batch);
      allExtracted.push(...guests);
    }

    results.extracted = allExtracted.length;

    // 4. Deduplicate within this run, then insert or update
    const seenThisRun = new Set<string>();

    for (const guest of allExtracted) {
      const normalized = normalizeArabicName(guest.name);
      if (seenThisRun.has(normalized)) continue;
      seenThisRun.add(normalized);

      const existing = existingMap.get(normalized);

      if (!existing) {
        // New guest — insert
        const { error } = await supabaseAdmin.from("guests").insert({
          name: normalized,
          title: guest.title,
          category: guest.category,
        });
        if (error) results.errors.push(`insert ${normalized}: ${error.message}`);
        else results.inserted++;
      } else {
        // Already exists — update title only if new one is richer (longer)
        if (guest.title.length > existing.title.length) {
          const { error } = await supabaseAdmin
            .from("guests")
            .update({ title: guest.title })
            .eq("id", existing.id);
          if (error) results.errors.push(`update ${normalized}: ${error.message}`);
          else results.updated++;
        } else {
          results.skipped++;
        }
        // Add to map so future chunks don't re-process
        existingMap.set(normalized, { id: existing.id, title: guest.title.length > existing.title.length ? guest.title : existing.title });
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[guests/import]", err);
    return NextResponse.json({ ...results, error: String(err?.message ?? err) }, { status: 500 });
  }
}
