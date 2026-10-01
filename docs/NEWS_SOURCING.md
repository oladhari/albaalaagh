# News sourcing workflow

Albaalaagh uses free public RSS feeds to discover stories. A feed item is a lead,
not a publishable Albaalaagh report by itself.

## Source order

1. Primary official material: Tunisian government and institutions, the UN,
   USGS, GDACS, or NASA.
2. Established Tunisian and Arabic reporting.
3. Established international and technology reporting.

The source registry in `src/types/index.ts` contains only feeds checked during
development. Feed failures are isolated so one unavailable publisher does not
stop the remaining imports.

## Publishing rules

- Keep the exact original URL and publisher name.
- Add at least one valid source before publishing.
- Attribute claims in the report body; a source box alone is not enough.
- Translate English reporting into natural Arabic without copying its wording.
- Do not invent details to reach a target length.
- Distinguish a source's claim from independently verified fact.
- Add Albaalaagh context, implications, unanswered questions, or reporting.
- Add a second source for disputed, political, military, casualty, or breaking
  claims whenever one is available.

## Historical reports

Existing reports without a saved citation remain readable, but are marked
`noindex` and excluded from the sitemap. An editor can restore indexing by
opening the report in the news admin, adding the original source URL, improving
the report where necessary, and saving it.

Do not guess historical sources. A similar headline is not enough when the
publisher or exact original URL cannot be confirmed.

### Recovery audit

Run the citation recovery tool in dry-run mode first:

```bash
npm run news:recover-citations -- --output=/tmp/news-citation-review.json
```

The tool preserves report titles, introductions, and bodies. It compares each
old report's title, introduction, and body with retained source titles and text.
Its evidence score includes title similarity, distinctive-word and phrase
coverage, compatible numbers, publication proximity, and ambiguity from other
possible matches. Review every proposed URL before applying:

```bash
npm run news:recover-citations -- --apply
```

`--apply` inserts citations for high-confidence matches only. It never rewrites
published content. Reports marked `manual_research` need an editor to find and
verify the exact original page.

The initial production audit on 17 September 2026 found 519 approved historical
reports and no title-only matches that met the automatic safety threshold. The
later full-text audit found one high-confidence match and two review candidates.
The verified high-confidence citation was applied; the ambiguous candidates were
left unchanged. Recover the remaining reports in editorial batches, starting
with recent and high-traffic pages, instead of lowering the threshold.

Adding a citation is necessary but is not an editorial rewrite. After confirming
the source, retain an accurate title and introduction if desired, then revise the
body to include attributable facts plus Albaalaagh's own context, verification,
implications, or unanswered questions. Do not use AI to expand a source merely
to make an article longer, and do not republish source wording as a translation.

### Free manual recovery queue

The old per-request prompts and clicked URLs were not stored. When retained
source rows do not produce a safe match, generate a resumable browser review
queue without calling any AI or search API:

```bash
npm run news:source-review -- --limit=50 --output=/tmp/albaalaagh-news-source-review.html
```

Open the HTML file locally. Each report includes direct Google, Bing, and
DuckDuckGo searches. Progress stays in browser local storage. Enter only an
exact source page that you have opened and verified, write a short attribution
that accurately limits the claim to what the source establishes, then download
the verified JSON file.

Validate that export with a database dry run:

```bash
npm run news:apply-verified-sources -- --input=/path/to/albaalaagh-verified-news-sources.json
```

Only after reviewing the dry-run list, repeat with `--apply`. The apply tool
rejects already-cited reports, inserts the citation, adds the written
attribution to the body, and first saves a backup under `/tmp`. Reports listed
in `docs/news-source-recovery-audit.md` are excluded from the queue because they
need correction or stronger evidence rather than a guessed citation.

## Deployment

Apply `supabase/migrations/20260917070000_news_citations.sql` before deploying
the application code. The migration adds source metadata to `news` and creates
the public-readable `news_citations` relation used by report pages and the
admin editor.
