# «من برامجنا»

Editorial readings of Albaalaagh's own episodes live at `/from-programmes`.
They use `articles` with category `من برامجنا`; reports retain their existing
categories and routes. No database migration is required. The normal article
index excludes this category; homepage article cards resolve to the dedicated
canonical URL. Compact alphanumeric CMS slugs are retained; other slugs fall
back to the UUID without hyphens.

Create a draft through `/admin/from-programmes` or
`/admin/articles/new?category=programme`. The existing editor provides a source
card helper: programme, participants, broadcast date and full YouTube URL.
It inserts escaped HTML plus the privacy-enhanced player into the article body.
Source details remain editable in the body, so the existing table/API remains
compatible. When replacing a card, edit/remove its previous HTML first.

The source broadcast date is independent of the article's publication date.
Do not backdate a newly written article to the episode's date. Preserve each
speaker's attribution; distinguish guest claims, independently verified context
and newsroom interpretation. Reuse AraClip's available transcript before
transcribing again. Review transcription errors, names and selected quotations
against the recording. Avoid presenting unsupported comparisons as facts.
Include timestamp links for important arguments and identify limits in the source.

Use a still cover, preferably the channel's existing episode cover or a verified
frame. Put the full video near the introduction, with meaningful title/caption.
The existing report body supports responsive video, inline figures, accessible
scrollable tables, source links and the channel's organization byline.

Draft previews require the existing admin session and `?preview=1`, are noindex,
and omit public share controls. Anonymous requests cannot view drafts, including
with the preview query. Public lists and the sitemap omit unpublished records.

Publishing through the existing admin article API dispatches the main cover and
`/from-programmes/<compact-id>` URL to the existing SNS adapters, like articles
and reports. Creating a draft or editing a published article does not dispatch
another share. The feature does not authorize publication or sharing by itself.
