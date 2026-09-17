#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(dir, "../.env.local"), "utf8");
const getEnv = (name) => env.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim() ?? "";
const apply = process.argv.includes("--apply");
const sb = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));

function youtubeId(row) {
  const values = [row.video_url, row.thumbnail_url];
  for (const value of values) {
    if (!value) continue;
    const match = value.match(/(?:youtu\.be\/|[?&]v=|youtube\.com\/embed\/|i\.ytimg\.com\/vi\/)([\w-]{11})/);
    if (match) return match[1];
  }
  return null;
}

function isYoutube(url = "") {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function isR2(url = "") {
  return /(?:media\.albaalaagh\.com|r2\.dev)/i.test(url);
}

function olderFirst(a, b) {
  const aTime = Date.parse(a.created_at ?? a.published_at ?? "9999-12-31");
  const bTime = Date.parse(b.created_at ?? b.published_at ?? "9999-12-31");
  return aTime - bTime || a.id.localeCompare(b.id);
}

async function fetchAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("site_videos")
      .select("id,title,description,video_url,thumbnail_url,published_at,created_at,video_type,hashtags,playlist_id,published")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

function chooseText(primary, secondary, field) {
  const first = primary[field]?.trim();
  const second = secondary[field]?.trim();
  if (!first) return second || null;
  if (!second) return first;
  return second.length > first.length ? second : first;
}

async function main() {
  const rows = await fetchAll();
  const groups = new Map();
  for (const row of rows) {
    const id = youtubeId(row);
    if (!id) continue;
    groups.set(id, [...(groups.get(id) ?? []), row]);
  }

  const r2Owners = new Map();
  const candidates = [];
  const skipped = [];

  for (const [sourceId, group] of groups) {
    const youtubeRows = group.filter((row) => isYoutube(row.video_url));
    const r2Rows = group.filter((row) => isR2(row.video_url));
    if (group.length !== 2 || youtubeRows.length !== 1 || r2Rows.length !== 1) {
      if (group.length > 1) skipped.push({ sourceId, reason: "not exactly one YouTube and one R2 row", rows: group });
      continue;
    }

    const r2 = r2Rows[0];
    const previousOwner = r2Owners.get(r2.video_url);
    if (previousOwner && previousOwner !== sourceId) {
      skipped.push({ sourceId, reason: `R2 URL also belongs to ${previousOwner}`, rows: group });
      continue;
    }
    r2Owners.set(r2.video_url, sourceId);

    const [canonical, retired] = [...group].sort(olderFirst);
    candidates.push({ sourceId, canonical, retired, youtube: youtubeRows[0], r2 });
  }

  const stamp = new Date().toISOString().replaceAll(":", "-");
  const auditPath = `/tmp/albaalaagh-video-consolidation-${stamp}.json`;
  writeFileSync(auditPath, JSON.stringify({ apply, candidates, skipped }, null, 2));

  console.log(`${apply ? "APPLY" : "DRY RUN"}: ${candidates.length} safe pairs; ${skipped.length} ambiguous groups skipped.`);
  console.log(`Audit: ${auditPath}`);
  if (!apply) {
    console.log("No database changes made. Run with --apply only after the migration is deployed.");
    return;
  }

  for (let index = 0; index < candidates.length; index += 1) {
    const { sourceId, canonical, retired, youtube, r2 } = candidates[index];
    const update = {
      youtube_video_id: sourceId,
      video_url: r2.video_url,
      title: chooseText(youtube, r2, "title"),
      description: chooseText(youtube, r2, "description"),
      thumbnail_url: youtube.thumbnail_url || r2.thumbnail_url,
      video_type: youtube.video_type || r2.video_type,
      hashtags: chooseText(youtube, r2, "hashtags"),
      playlist_id: youtube.playlist_id || r2.playlist_id,
      published_at: youtube.published_at || r2.published_at,
      published: youtube.published || r2.published,
    };

    const { error: updateError } = await sb.from("site_videos").update(update).eq("id", canonical.id);
    if (updateError) throw new Error(`Update ${canonical.id}: ${updateError.message}`);

    const { error: redirectError } = await sb
      .from("video_redirects")
      .upsert({ old_id: retired.id, canonical_id: canonical.id });
    if (redirectError) throw new Error(`Redirect ${retired.id}: ${redirectError.message}`);

    const { error: deleteError } = await sb.from("site_videos").delete().eq("id", retired.id);
    if (deleteError) throw new Error(`Delete row ${retired.id}: ${deleteError.message}`);

    if ((index + 1) % 50 === 0 || index + 1 === candidates.length) {
      console.log(`Consolidated ${index + 1}/${candidates.length}`);
    }
  }

  console.log("Done. R2 objects were not modified or deleted.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
