@AGENTS.md

# Video publishing

- Use the `/reels` command for new YouTube Shorts. It downloads each short and
  publishes it to Facebook Reels, Instagram Reels, and the website's `/shorts`
  page.
- `/reels` must run the standalone `scripts/upload-shorts-to-fb-reels.mjs`
  workflow. Do not use the Next.js dev server, localhost admin page, or
  `/api/admin/ytfb` route for this task.
- If `/reels` is called without URLs, discover the newest Shorts and show the
  proposed batch for explicit confirmation before publishing. URLs supplied by
  the user with the command count as confirmation for that ordered batch.
- The website copy must use the Cloudflare R2 URL and be stored in
  `site_videos` with `video_type = 'short'`. YouTube is only a temporary source
  or fallback; do not create a second published row when an R2-backed row
  already exists.
- Report the result for every destination separately: Facebook, Instagram, and
  the website. An Instagram failure does not prevent the Facebook or website
  steps from completing.
- Keep the full operational procedure in `.claude/commands/reels.md` and update
  that command whenever the upload script's behavior changes.
