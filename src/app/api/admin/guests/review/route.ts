import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { reviewGuests } from "@/lib/ai/workflows";
import { AiProviderError, toAdminAiResponse } from "@/lib/ai/provider";

export const maxDuration = 60;

export interface GuestUpdate {
  id: string;
  current_name: string;
  current_title: string;
  current_category: string[];
  name?: string;
  title?: string;
  category?: string[];
  reason: string;
}

export interface GuestDuplicate {
  ids: string[];
  names: string[];
  reason: string;
}

export interface GuestUncertain {
  id: string;
  name: string;
  reason: string;
}

export interface ReviewResult {
  updates: GuestUpdate[];
  duplicates: GuestDuplicate[];
  uncertain: GuestUncertain[];
  hasMore: boolean;
  nextOffset: number;
  total: number;
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit  = 50;

  const { data: guests, error } = await supabaseAdmin
    .from("guests")
    .select("id, name, title, category")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!guests?.length) return NextResponse.json({ updates: [], duplicates: [], uncertain: [], hasMore: false, nextOffset: 0, total: 0 });

  const chunk = guests.slice(offset, offset + limit);
  const hasMore = offset + limit < guests.length;

  try {
    const raw = await reviewGuests(
      chunk.map((g) => ({
        id: g.id,
        name: g.name,
        title: g.title ?? "",
        category: Array.isArray(g.category) ? g.category as string[] : (g.category ? [String(g.category)] : []),
      })),
      guests.map((g) => ({ id: g.id, name: g.name })),
    );

    // Enrich updates with current values for UI diff
    const guestMap = new Map(guests.map((g) => [g.id, g]));
    const updates = (raw.updates ?? [])
      .filter((u) => guestMap.has(u.id))
      .map((u) => {
        const g = guestMap.get(u.id)!;
        const cat = g.category;
        const currentCategory: string[] = Array.isArray(cat) ? cat : (cat ? [cat as unknown as string] : []);
        return {
          ...u,
          name: u.name ?? undefined,
          title: u.title ?? undefined,
          current_name: g.name,
          current_title: g.title ?? "",
          current_category: currentCategory,
        };
      });

    const knownIds = new Set(guests.map((g) => g.id));

    return NextResponse.json({
      updates,
      duplicates: raw.duplicates.filter((item) => item.ids.length >= 2 && item.ids.every((id) => knownIds.has(id))),
      uncertain: raw.uncertain.filter((item) => knownIds.has(item.id)),
      hasMore,
      nextOffset: offset + limit,
      total: guests.length,
    });
  } catch (err: unknown) {
    if (err instanceof AiProviderError) {
      const response = toAdminAiResponse(err);
      return NextResponse.json({ error: response.error, category: response.category }, { status: response.status });
    }
    console.error(JSON.stringify({ event: "guest_review_failed", route: "/api/admin/guests/review" }));
    return NextResponse.json({ error: "تعذّرت مراجعة الضيوف." }, { status: 500 });
  }
}
