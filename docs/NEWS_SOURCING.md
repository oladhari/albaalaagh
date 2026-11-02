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

## Article-body retrieval and the review shortlist

Tunisie Telegraph (`تونيزي تلغراف`) uses its public `/feed/` for discovery.
Generation separately fetches the article's `td-post-content` body, including
the final paragraph, and excludes surrounding article recommendations. A headline,
RSS excerpt or metadata description alone still fails extraction. Three current
articles passed local full-body checks when this source was added. A live
production draft-only test also retrieved the fuel-transport strike article,
including its agreement details absent from the discovery excerpt. No article
was published during the test.

`src/lib/news-source.ts` fetches bounded public pages and extracts actual article
containers or explicit `articleBody` data. Mosaïque's body is the URL-matched
`__NEXT_DATA__.props.pageProps.pagedata.article.description` HTML, not its SEO
teaser. Anadolu's streamed body and UN/France 24 containers need separate DOM
scopes. Never fall back to arbitrary page paragraphs, RSS excerpts or metadata.
USGS event pages require their official GeoJSON API; GDACS uses labelled event
summary tables. Keep event evidence separate from generic disaster-model help.

NASA's public `192.0.66.*` hosting addresses must not be confused with the special
`192.0.0.0/24` range. Private, loopback, link-local and reserved addresses remain
blocked, including after redirects.

The admin opens **أهم الأخبار** by default: at most 12 Tunisian and 12 other
important stories from the last 24 hours, plus the existing technology/science
choices. Wars, major disasters and national developments receive stronger
ranking. This is a deterministic discovery aid, not a factual verification or
an automatic publication decision. **كل الأخبار الجديدة** retains the complete
pending list. Existing pending items are re-scored on reads; no backfill or edits
to published articles are needed. Geography follows story content where known,
not simply the publisher's home country. BBC Arabic's free official feed replaces
France 24 for discovery: France 24 passed local extraction checks but failed the
live production-server retrieval test. Its old pending suggestions are hidden,
not deleted; approved/rejected history is preserved. BBC Arabic and Mosaïque
both passed live, draft-only generation tests.

For live extraction audit details, see [the October 2026 source audit](news-source-audit-2026-10-31.md).

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
