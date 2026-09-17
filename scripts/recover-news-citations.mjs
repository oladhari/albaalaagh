import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

loadLocalEnv();

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg?.slice("--output=".length) || null;
const thresholdArg = process.argv.find((arg) => arg.startsWith("--threshold="));
const threshold = Number(thresholdArg?.slice("--threshold=".length) ?? "0.72");

if (!Number.isFinite(threshold) || threshold < 0.7 || threshold > 1) {
  throw new Error("--threshold must be a number between 0.7 and 1");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ARABIC_STOP_WORDS = new Set([
  "إلى", "الى", "في", "من", "عن", "على", "مع", "بعد", "قبل", "بين", "ضد",
  "هذا", "هذه", "ذلك", "تلك", "أن", "ان", "ما", "لا", "لم", "لن", "قد", "و",
  "أو", "او", "ثم", "هو", "هي", "كما", "عبر", "حول", "لدى", "خلال", "بسبب",
]);

function normalizeArabic(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tokens(value) {
  return new Set(
    normalizeArabic(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !ARABIC_STOP_WORDS.has(token))
  );
}

function diceSimilarity(a, b) {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return (2 * intersection) / (a.size + b.size);
}

function coverage(a, b) {
  if (!a.size || !b.size) return 0;
  return [...a].filter((token) => b.has(token)).length / a.size;
}

function ngrams(value, size = 2) {
  const words = normalizeArabic(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !ARABIC_STOP_WORDS.has(token));
  const result = new Set();
  for (let index = 0; index <= words.length - size; index++) {
    result.add(words.slice(index, index + size).join(" "));
  }
  return result;
}

function phraseCoverage(sourcePhrases, reportPhrases) {
  if (!sourcePhrases.size || !reportPhrases.size) return 0;
  return [...sourcePhrases].filter((phrase) => reportPhrases.has(phrase)).length /
    sourcePhrases.size;
}

function numbers(value) {
  return [...normalizeArabic(value).matchAll(/\d+/g)].map((match) => match[0]).sort();
}

function numberEvidence(sourceNumbers, reportNumbers) {
  if (!sourceNumbers.length) return { score: 0.5, conflict: false };
  const shared = sourceNumbers.filter((number) => reportNumbers.includes(number));
  return {
    score: shared.length / sourceNumbers.length,
    conflict: reportNumbers.length > 0 && shared.length === 0,
  };
}

function daysApart(left, right) {
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 86_400_000;
}

async function fetchAll(table, columns, configure = (query) => query) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const query = configure(
      supabase.from(table).select(columns).range(from, from + pageSize - 1)
    );
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

const [reports, candidates, citations] = await Promise.all([
  fetchAll(
    "news",
    "id,slug,title,excerpt,content,published_at,created_at",
    (query) => query.eq("status", "approved").eq("source", "البلاغ")
  ),
  fetchAll(
    "news",
    "id,title,excerpt,content,url,source,published_at,created_at,source_kind",
    (query) => query.neq("source", "البلاغ").not("url", "is", null)
  ),
  fetchAll("news_citations", "news_id,url"),
]);

const citedIds = new Set(citations.map((citation) => citation.news_id));
const unresolved = reports.filter((report) => !citedIds.has(report.id));
const preparedCandidates = candidates.map((candidate) => {
  const sourceText = [candidate.title, candidate.excerpt, candidate.content]
    .filter(Boolean)
    .join(" ");
  return {
    candidate,
    titleTokens: tokens(candidate.title),
    sourceTokens: tokens(sourceText),
    sourcePhrases: ngrams(sourceText),
    sourceNumbers: numbers(sourceText),
  };
});

const review = unresolved.map((report) => {
  const reportText = [report.title, report.excerpt, report.content].filter(Boolean).join(" ");
  const reportTitleTokens = tokens(report.title);
  const reportTokens = tokens(reportText);
  const reportPhrases = ngrams(reportText);
  const reportNumbers = numbers(reportText);
  const matches = preparedCandidates
    .map(({ candidate, titleTokens, sourceTokens, sourcePhrases, sourceNumbers }) => {
      const days = daysApart(
        report.published_at ?? report.created_at,
        candidate.published_at ?? candidate.created_at
      );
      const titleScore = diceSimilarity(reportTitleTokens, titleTokens);
      const sourceCoverage = coverage(sourceTokens, reportTokens);
      const distinctiveCoverage = coverage(titleTokens, reportTokens);
      const phrases = phraseCoverage(sourcePhrases, reportPhrases);
      const numberMatch = numberEvidence(sourceNumbers, reportNumbers);
      const dateScore = Math.max(0, 1 - days / 7);
      const score =
        titleScore * 0.34 +
        sourceCoverage * 0.24 +
        distinctiveCoverage * 0.16 +
        phrases * 0.10 +
        numberMatch.score * 0.10 +
        dateScore * 0.06 -
        (numberMatch.conflict ? 0.12 : 0);

      return {
        candidate,
        score,
        days,
        evidence: {
          title: titleScore,
          source_coverage: sourceCoverage,
          distinctive_coverage: distinctiveCoverage,
          phrase_coverage: phrases,
          number_score: numberMatch.score,
          number_conflict: numberMatch.conflict,
        },
      };
    })
    .filter(({ days, evidence }) =>
      days <= 7 &&
      evidence.title >= 0.25 &&
      evidence.distinctive_coverage >= 0.45
    )
    .sort((a, b) => b.score - a.score || a.days - b.days);

  const best = matches[0];
  const runnerUp = matches[1];
  const confident = Boolean(
    best &&
    best.score >= threshold &&
    best.evidence.title >= 0.5 &&
    best.evidence.source_coverage >= 0.45 &&
    !best.evidence.number_conflict &&
    (!runnerUp || best.score - runnerUp.score >= 0.06)
  );
  const reviewable = Boolean(best && best.score >= 0.55);

  return {
    news_id: report.id,
    slug: report.slug,
    title: report.title,
    excerpt: report.excerpt,
    status: confident
      ? "high_confidence"
      : reviewable
        ? "review_candidate"
        : "manual_research",
    match: best ? {
      source: best.candidate.source,
      source_title: best.candidate.title,
      source_url: best.candidate.url,
      source_kind: best.candidate.source_kind ?? "media",
      score: Number(best.score.toFixed(3)),
      days_apart: Number(best.days.toFixed(2)),
      evidence: Object.fromEntries(
        Object.entries(best.evidence).map(([key, value]) => [
          key,
          typeof value === "number" ? Number(value.toFixed(3)) : value,
        ])
      ),
    } : null,
    alternatives: matches.slice(1, 3).map((alternative) => ({
      source: alternative.candidate.source,
      source_title: alternative.candidate.title,
      source_url: alternative.candidate.url,
      score: Number(alternative.score.toFixed(3)),
    })),
  };
});

const highConfidence = review.filter((item) => item.status === "high_confidence");
const reviewCandidates = review.filter((item) => item.status === "review_candidate");
let inserted = 0;

if (apply && highConfidence.length) {
  const rows = highConfidence.map((item) => ({
    news_id: item.news_id,
    name: item.match.source,
    url: item.match.source_url,
    kind: ["official", "agency", "media"].includes(item.match.source_kind)
      ? item.match.source_kind
      : "media",
    is_primary: true,
  }));
  const { error } = await supabase.from("news_citations").upsert(rows, {
    onConflict: "news_id,url",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`news_citations: ${error.message}`);
  inserted = rows.length;
}

const result = {
  generated_at: new Date().toISOString(),
  dry_run: !apply,
  threshold,
  totals: {
    approved_reports: reports.length,
    already_cited: reports.length - unresolved.length,
    unresolved: unresolved.length,
    high_confidence: highConfidence.length,
    review_candidates: reviewCandidates.length,
    manual_research: review.length - highConfidence.length - reviewCandidates.length,
    citation_rows_attempted: inserted,
  },
  review,
};

if (outputPath) {
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  console.log(`Review file written to ${outputPath}`);
}

console.log(JSON.stringify(result.totals, null, 2));
if (!apply) console.log("Dry run only. Review matches before using --apply.");
