import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { fetchPlaylistNames } from "@/lib/youtube";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const playlists = await fetchPlaylistNames();
  return NextResponse.json(playlists);
}
