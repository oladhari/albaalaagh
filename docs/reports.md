# Reports

Written and video reports reuse the existing `articles` CMS and its draft/publication flow. No database migration is needed. Categories `تقارير` and `تقارير فيديو` select the report presentation. The report list is `/reports`; each report has a stable `/reports/<slug>` canonical. Legacy `/articles/<slug>` links redirect published reports to the canonical route, preserving compatibility with existing sharing scripts.

Admin: `/admin/reports` links to existing article editors. Choose a report category, add title/excerpt/cover and standalone HTML content. The media helper adds figures with Arabic alt text/captions, permanent PDF links, or privacy-enhanced YouTube embeds. Media is added at the end and can be moved to the appropriate paragraph in the HTML editor. Images can be opened full size. Report tables should use a `report-table` wrapper, a caption, and scoped headings for accessible horizontal scrolling on mobile.

Publication requires BOTH `published=true` and `status=published`. Authenticated administrators can preview drafts with `?preview=1`; preview uses the existing admin session, is dynamic and noindex, and omits share buttons/Article structured data. Anonymous requests cannot unlock drafts with that parameter. Draft asset upload is separate from article publication: objects in public R2 remain public even when the article is a draft.

Reports credit قناة البلاغ الرقمية and expose canonical, Open Graph/Facebook and Twitter metadata from the stored title/excerpt/cover. Public listings and sitemap include only published reports. Existing publication actions may share content externally; saving a draft must keep `published=false`, `status=draft`, and `published_at=null`.

For a video report, keep a substantive written account with findings, context, and sources alongside the embed. Do not publish a formerly private source video or change its visibility as part of creating a report.

The initial presidency-budget draft and source review artifacts are under `/mnt/linuxdata/albaalaagh-reports/presidency-budget/`. Its report-specific numerical data belongs to that draft, not the generic report renderer. The original source PDF is preserved unchanged in R2 with attachment disposition; original embedded charts are reused without generated numerical imagery.

## Deployment and Node.js security checklist

This Next.js application uses Node.js. Local report validation ran on **24.22.1**, one of the patched releases in the [October 21, 2026 Node.js security advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases). That advisory includes CVE-2026-111497 (Brotli decoder remote code execution). The production runtime has not been verified; local validation does not establish production remediation.

Before closing the linked implementation issue:

- [ ] Record exact Node.js versions for production/preview builds, server functions, CI and long-running Node.js workers/scripts.
- [ ] Update any affected runtime to a patched supported release: 24.22.1+, 22.23.4+, or 26.12.1+ on the corresponding line, and document the selected runtime policy.
- [ ] Verify hosting-provider patch availability; redeploy/rebuild and restart affected processes.
- [ ] Re-run build/tests and critical report, admin and publishing smoke checks on the updated runtime.
- [ ] Record the exact deployed version and verification evidence in issue #14.

Updating `@types/node` alone does not update Node.js. Track this operational checklist in [issue #14](https://github.com/oladhari/albaalaagh/issues/14); merging report code does not itself complete the runtime upgrade.
