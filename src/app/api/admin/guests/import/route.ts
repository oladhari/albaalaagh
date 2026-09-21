import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchAllVideosWithDescriptions } from "@/lib/youtube";
import { extractGuestsFromBatch, type ExtractedGuest } from "@/lib/ai/workflows";
import { AiProviderError, toAdminAiResponse } from "@/lib/ai/provider";

export const maxDuration = 300; // 5 min — requires Vercel Pro; Hobby gets 60s

function normalizeArabicName(name: string): string {
  return name
    .replace(/^(الدكتور|الأستاذ|الشيخ|السيد|المحامي|الأستاذة|الدكتورة|السيدة)\s+/u, "")
    .replace(/\s+/g, " ")
    .trim();
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

    // 3. Batch AI extraction (10 videos per call — keeps prompt short)
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
          category: [guest.category],
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
  } catch (err: unknown) {
    if (err instanceof AiProviderError) {
      const response = toAdminAiResponse(err);
      return NextResponse.json({ ...results, error: response.error, category: response.category }, { status: response.status });
    }
    console.error(JSON.stringify({ event: "guest_import_failed", route: "/api/admin/guests/import" }));
    return NextResponse.json({ ...results, error: "تعذّر استيراد الضيوف." }, { status: 500 });
  }
}
