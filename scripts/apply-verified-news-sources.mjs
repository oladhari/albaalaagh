#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function addAttribution(content, item) {
  if (content.includes("data-source-attribution=")) {
    throw new Error(`${item.id}: report already contains a source attribution block`);
  }
  const block = `<p data-source-attribution="true"><strong>المصدر والتحقق:</strong> ${escapeHtml(item.attribution)} <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">الاطلاع على المصدر الأصلي</a>.</p>`;
  const openingDiv = content.match(/^\s*(<div\b[^>]*>)/i);
  if (!openingDiv) return `${block}\n${content}`;
  const index = openingDiv.index + openingDiv[0].length;
  return `${content.slice(0, index)}\n${block}${content.slice(index)}`;
}

loadLocalEnv();
const inputArg = process.argv.find((item) => item.startsWith("--input="));
if (!inputArg) throw new Error("Use --input=/path/to/albaalaagh-verified-news-sources.json");
const apply = process.argv.includes("--apply");
const inputPath = inputArg.slice("--input=".length);
const payload = JSON.parse(readFileSync(inputPath, "utf8"));
const verified = payload.verified;
if (!Array.isArray(verified) || verified.length === 0) throw new Error("Input has no verified items");

// Keep this in sync with the news_citations_kind_check database constraint.
const allowedKinds = new Set(["official", "agency", "media", "emergency"]);
const seenIds = new Set();
for (const item of verified) {
  if (!item.id || !item.name?.trim() || !item.attribution?.trim() || !allowedKinds.has(item.kind)) {
    throw new Error("Every item requires id, name, attribution, and a valid kind");
  }
  if (seenIds.has(item.id)) throw new Error(`Duplicate report ID: ${item.id}`);
  seenIds.add(item.id);
  const url = new URL(item.url);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${item.id}: source URL must use HTTP(S)`);
  item.url = url.toString();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Supabase environment variables are required");
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const ids = verified.map((item) => item.id);

const [{ data: reports, error: reportError }, { data: citations, error: citationError }] = await Promise.all([
  supabase.from("news").select("id,slug,title,content,status,source,source_kind,updated_at").in("id", ids),
  supabase.from("news_citations").select("news_id,url").in("news_id", ids),
]);
if (reportError) throw reportError;
if (citationError) throw citationError;
if (reports.length !== ids.length) throw new Error(`Expected ${ids.length} reports, found ${reports.length}`);
if (citations.length) throw new Error(`Refusing to alter ${citations.length} report(s) that already have citations`);

const reportById = new Map(reports.map((report) => [report.id, report]));
const changes = verified.map((item) => {
  const report = reportById.get(item.id);
  if (report.status !== "approved" || report.source !== "البلاغ") {
    throw new Error(`${item.id}: expected an approved Albaalaagh report`);
  }
  return { item, report, content: addAttribution(report.content ?? "", item) };
});

const stamp = new Date().toISOString().replaceAll(":", "-");
const backupPath = `/tmp/albaalaagh-verified-source-apply-${stamp}.json`;
writeFileSync(backupPath, `${JSON.stringify(reports, null, 2)}\n`, { flag: "wx" });
console.log(`${apply ? "APPLY" : "DRY RUN"}: ${changes.length} verified source(s)`);
console.log(`Backup: ${backupPath}`);
for (const { item, report } of changes) console.log(`- ${report.title} <- ${item.name}`);
if (!apply) {
  console.log("No database changes made. Re-run with --apply after reviewing this list.");
  process.exit(0);
}

for (const { item, report, content } of changes) {
  const { error: updateError } = await supabase.from("news").update({
    content,
    source_kind: item.kind,
    updated_at: new Date().toISOString(),
  }).eq("id", item.id);
  if (updateError) throw new Error(`${report.slug}: ${updateError.message}`);
  const { error: insertError } = await supabase.from("news_citations").insert({
    news_id: item.id,
    name: item.name.trim(),
    url: item.url,
    kind: item.kind,
    is_primary: true,
  });
  if (insertError) throw new Error(`${report.slug}: ${insertError.message}`);
  console.log(`Updated ${report.slug}`);
}

console.log("Verified source batch complete.");
