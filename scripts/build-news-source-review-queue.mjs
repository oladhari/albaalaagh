#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

function argument(name, fallback) {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function plainText(value = "") {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAll(supabase, table, columns, configure = (query) => query) {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await configure(
      supabase.from(table).select(columns).range(from, from + pageSize - 1)
    );
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const limit = Number(argument("limit", "0"));
const offset = Number(argument("offset", "0"));
if (!Number.isInteger(limit) || limit < 0 || !Number.isInteger(offset) || offset < 0) {
  throw new Error("--limit and --offset must be non-negative integers");
}

const outputPath = resolve(argument("output", "/tmp/albaalaagh-news-source-review.html"));
const auditPath = resolve("docs/news-source-recovery-audit.md");
const blockedIds = new Set(
  existsSync(auditPath)
    ? [...readFileSync(auditPath, "utf8").matchAll(/`([0-9a-f]{8}-[0-9a-f-]{27})`/gi)].map((match) => match[1])
    : []
);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [reports, citations] = await Promise.all([
  fetchAll(
    supabase,
    "news",
    "id,slug,title,excerpt,content,published_at,created_at,source_kind,source_topic",
    (query) => query.eq("status", "approved").eq("source", "البلاغ").order("published_at", { ascending: false })
  ),
  fetchAll(supabase, "news_citations", "news_id"),
]);

const citedIds = new Set(citations.map((item) => item.news_id));
const unresolved = reports
  .filter((item) => !citedIds.has(item.id) && !blockedIds.has(item.id))
  .slice(offset, limit ? offset + limit : undefined)
  .map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: plainText(item.excerpt || item.content).slice(0, 700),
    published_at: item.published_at ?? item.created_at,
    kind: item.source_kind ?? "media",
    topic: item.source_topic ?? "",
    report_url: `https://www.albaalaagh.com/taqrir/${encodeURIComponent(item.slug)}`,
  }));

const data = JSON.stringify(unresolved).replaceAll("<", "\\u003c");
const generatedAt = new Date().toISOString();
const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>مراجعة مصادر تقارير البلاغ</title>
  <style>
    :root{font-family:Arial,"Noto Sans Arabic",sans-serif;color:#1d1d1f;background:#f5f3ec}body{margin:0}.wrap{max-width:1100px;margin:auto;padding:24px}.top{position:sticky;top:0;background:#f5f3ecF2;padding:14px 0;z-index:2;border-bottom:1px solid #d8d1bc}h1{margin:0 0 8px}.muted{color:#68645a;font-size:14px}.controls{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}button,.button{border:0;border-radius:8px;padding:10px 14px;background:#202020;color:white;text-decoration:none;cursor:pointer}.gold{background:#9a7923}.card{background:white;border:1px solid #ded9ca;border-radius:12px;padding:18px;margin:18px 0;box-shadow:0 2px 8px #0000000a}.done{border-color:#2e8b57;background:#f7fff9}.title{font-size:21px;font-weight:700;line-height:1.6}.meta{font-size:13px;color:#777;margin:4px 0 10px}.excerpt{line-height:1.8;background:#faf9f4;padding:12px;border-radius:8px}.searches{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.searches a{color:#6b5315}label{display:block;margin-top:10px;font-weight:700}input,textarea,select{box-sizing:border-box;width:100%;padding:10px;border:1px solid #c8c1af;border-radius:7px;font:inherit;background:white}textarea{min-height:80px}.row{display:grid;grid-template-columns:1fr 2fr;gap:10px}.ltr{direction:ltr;text-align:left}@media(max-width:700px){.row{grid-template-columns:1fr}.wrap{padding:12px}}
  </style>
</head>
<body><div class="wrap">
  <div class="top">
    <h1>مراجعة مصادر تقارير البلاغ القديمة</h1>
    <div class="muted">${unresolved.length} تقريراً في هذه الدفعة · أُنشئت ${generatedAt} · الحفظ محلي في هذا المتصفح فقط</div>
    <div id="progress" class="muted"></div>
    <div class="controls"><button class="gold" id="export">تنزيل المصادر المتحقق منها</button><button id="clear">مسح الحقول غير المكتملة</button></div>
  </div>
  <div id="list"></div>
</div>
<script>
const reports=${data};
const storageKey="albaalaagh-source-review-v1";
let saved=JSON.parse(localStorage.getItem(storageKey)||"{}");
const esc=(value)=>String(value??"").replace(/[&<>"']/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const valid=(item)=>item.name?.trim()&&/^https?:\\/\\//i.test(item.url?.trim())&&item.attribution?.trim();
const query=(text)=>encodeURIComponent(text);
function persist(){localStorage.setItem(storageKey,JSON.stringify(saved));renderProgress()}
function renderProgress(){const count=reports.filter((report)=>valid(saved[report.id]||{})).length;document.querySelector("#progress").textContent="مكتمل وجاهز للتصدير: "+count+" / "+reports.length;document.querySelectorAll(".card").forEach((card)=>card.classList.toggle("done",valid(saved[card.dataset.id]||{})))}
function setValue(id,key,value){saved[id]={...(saved[id]||{}),[key]:value};persist()}
document.querySelector("#list").innerHTML=reports.map((report,index)=>{const item=saved[report.id]||{};const date=report.published_at?new Date(report.published_at).toLocaleDateString("ar-TN"):"";const exact='"'+report.title+'"';return \
  '<article class="card" data-id="'+report.id+'"><div class="meta">'+(index+1)+' · '+esc(date)+' · '+esc(report.topic)+'</div><div class="title">'+esc(report.title)+'</div><p class="excerpt">'+esc(report.excerpt)+'</p><div class="searches"><a target="_blank" rel="noreferrer" href="'+report.report_url+'">فتح التقرير</a><a target="_blank" rel="noreferrer" href="https://www.google.com/search?q='+query(exact)+'">Google مطابق</a><a target="_blank" rel="noreferrer" href="https://www.google.com/search?q='+query(report.title)+'">Google موسّع</a><a target="_blank" rel="noreferrer" href="https://www.bing.com/search?q='+query(report.title)+'">Bing</a><a target="_blank" rel="noreferrer" href="https://duckduckgo.com/?q='+query(report.title)+'">DuckDuckGo</a></div><div class="row"><div><label>اسم المصدر</label><input data-key="name" value="'+esc(item.name||"")+'"></div><div><label>رابط الصفحة الأصلية</label><input class="ltr" data-key="url" value="'+esc(item.url||"")+'" placeholder="https://..."></div></div><div class="row"><div><label>نوع المصدر</label><select data-key="kind">'+["media","official","agency","emergency","science"].map((kind)=>'<option '+((item.kind||report.kind)===kind?'selected':'')+'>'+kind+'</option>').join("")+'</select></div><div><label>ملاحظة التحقق/النسبة التي ستظهر داخل التقرير</label><textarea data-key="attribution" placeholder="مثال: أفاد المصدر... وتبقى هذه المعلومة منسوبة إليه.">'+esc(item.attribution||"")+'</textarea></div></div></article>'}).join("");
document.querySelectorAll("[data-key]").forEach((field)=>field.addEventListener("input",()=>setValue(field.closest(".card").dataset.id,field.dataset.key,field.value)));
document.querySelector("#export").addEventListener("click",()=>{const verified=reports.filter((report)=>valid(saved[report.id]||{})).map((report)=>({id:report.id,slug:report.slug,title:report.title,name:saved[report.id].name.trim(),url:saved[report.id].url.trim(),kind:saved[report.id].kind||report.kind,attribution:saved[report.id].attribution.trim()}));if(!verified.length){alert("لا توجد عناصر مكتملة بعد.");return}const blob=new Blob([JSON.stringify({generated_at:new Date().toISOString(),verified},null,2)+"\\n"],{type:"application/json"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="albaalaagh-verified-news-sources.json";link.click();URL.revokeObjectURL(link.href)});
document.querySelector("#clear").addEventListener("click",()=>{if(!confirm("مسح الحقول غير المكتملة فقط؟"))return;for(const report of reports){if(!valid(saved[report.id]||{}))delete saved[report.id]}persist();location.reload()});
renderProgress();
</script></body></html>`;

writeFileSync(outputPath, html, { flag: "w" });
console.log(JSON.stringify({
  output: outputPath,
  approved_reports: reports.length,
  already_cited: citedIds.size,
  excluded_by_recovery_audit: blockedIds.size,
  queued: unresolved.length,
  offset,
  limit: limit || null,
}, null, 2));
