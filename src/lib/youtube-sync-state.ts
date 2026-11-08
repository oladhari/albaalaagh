import { supabaseAdmin } from "./supabase";

export interface PlaylistCheckpoint {
  members: string[];
  pendingMembers: string[];
  nextPageToken?: string;
  seenTokens?: string[];
}
export interface YouTubeSyncState {
  version: 1;
  playlists: Record<string, PlaylistCheckpoint>;
  nextPlaylistIndex: number;
  nextHeadIndex?: number;
  blockedUntil?: string;
  playlistNames?: { id: string; title: string }[];
}
export const emptyYouTubeSyncState = (): YouTubeSyncState => ({ version: 1, playlists: {}, nextPlaylistIndex: 0 });
const key = "youtube_sync_checkpoint_v1";
export async function loadYouTubeSyncState(): Promise<YouTubeSyncState> {
  const { data, error } = await supabaseAdmin.from("site_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error("YouTube sync checkpoint read failed; no API requests made");
  if (!data) return emptyYouTubeSyncState();
  try {
    const state = JSON.parse(data.value);
    if (state.version !== 1 || !state.playlists || typeof state.playlists !== "object" || !Number.isInteger(state.nextPlaylistIndex)) throw new Error();
    for (const p of Object.values(state.playlists) as PlaylistCheckpoint[]) {
      if (!Array.isArray(p.members) || !Array.isArray(p.pendingMembers)) throw new Error();
    }
    return state;
  } catch { throw new Error("YouTube sync checkpoint is invalid; refusing to restart an unbounded scan"); }
}
export async function saveYouTubeSyncState(state: YouTubeSyncState): Promise<void> {
  const { error } = await supabaseAdmin.from("site_settings").upsert({ key, value: JSON.stringify(state) }, { onConflict: "key" });
  if (error) throw new Error("YouTube sync checkpoint save failed");
}
