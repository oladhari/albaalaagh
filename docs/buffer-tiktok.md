# Buffer TikTok publishing

The local publisher remains canonical;
this adds an explicit TikTok destination using Buffer, without the rejected custom
TikTok app. Credentials are read from `BUFFER_TIKTOK_API` in `.env.local`.
No key is included in code, logs, plans, or the local ledger.

## Check, preview, submit, verify

Run from `/home/oladhari/albaalaagh`:

```sh
node --env-file=.env.local tools/buffer-tiktok/cli.mjs check
node --env-file=.env.local tools/buffer-tiktok/cli.mjs plan --site-id UUID
```

`plan` reads the published website Short, checks the public R2 file, and compares
the caption/video against paginated Buffer history. It makes no remote writes.
The caption is the existing description, falling back to the title; nothing is
generated or silently truncated. Website Shorts default to real-speaker footage
(`ai_generated: false`). For synthetic footage, supply an explicit JSON item.

After selecting and approving a specific reel for TikTok:

```sh
# Queue according to Buffer's configured posting schedule:
node --env-file=.env.local tools/buffer-tiktok/cli.mjs submit --site-id UUID --publish
# Or publish immediately:
node --env-file=.env.local tools/buffer-tiktok/cli.mjs submit --site-id UUID --publish --now
# Recheck Buffer status, save it locally, and mark confirmed deliveries done:
node --env-file=.env.local tools/buffer-tiktok/cli.mjs status
```

This is TikTok-only: it never republishes Facebook/Instagram or inserts website
video records. `status` writes a per-Short `tiktok_done:UUID` row to `site_settings`
only after Buffer confirms `sent` and supplies a TikTok URL. TikTok consent is
separate from the existing `/reels` skill's destinations.
Do not send an unselected backlog automatically.

Alternatively use `--file /absolute/path/item.json` instead of `--site-id`:

```json
{
  "source_id": "site:STABLE-WEBSITE-UUID",
  "video_url": "https://media.albaalaagh.com/shorts/EXISTING-FILE.mp4",
  "caption": "The approved Arabic caption",
  "ai_generated": false
}
```

Only existing public `/shorts/*.mp4` media on our public media host is accepted.
Captions over 2200 characters stop the workflow. Private archive URLs are rejected.

## New local reels: explicit opt-in handoff

The existing `scripts/upload-shorts-to-fb-reels.mjs` now accepts `--with-tiktok`
for local Shorts. The flag queues the same public video and caption in Buffer
after confirming the website insert. It does not upload a new YouTube copy.
Without this flag, the publisher keeps its existing destinations.

```sh
# This publishes to the publisher's usual public destinations AND queues TikTok.
# Run only for an approved new local reel, never to retry an existing publication.
node --env-file=.env.local scripts/upload-shorts-to-fb-reels.mjs --with-tiktok /absolute/path/reel.mp4
```

The flag rejects YouTube URL input, long-video and platform-only retry modes.
It checks Buffer authentication and all local caption lengths before starting.
Any error stops the batch. Resume a TikTok failure through the standalone
TikTok command after reviewing the local ledger; do not rerun other destinations.

`/scripts` is intentionally Git-ignored in this repository. The installed local
publisher was updated, and the exact integration is preserved for review and
reinstallation in `tools/buffer-tiktok/reels-publisher.patch`:

```sh
git apply --check tools/buffer-tiktok/reels-publisher.patch
git apply tools/buffer-tiktok/reels-publisher.patch
```

Do not apply twice. `git apply --reverse --check` verifies an already installed patch.

## Durable status and duplicate handling

`tools/buffer-tiktok/batch.mjs --manifest /path/selected.json` previews an explicit
ordered list of `site_ids`. Adding `--publish` sends that finite selection, one
clip at a time, waiting for delivery and a shared done mark before continuing.
It never expands the selection. Authentication, quota, ambiguous outcomes,
missing receipts and database failures stop the batch. Reusing the same manifest
skips locally tracked posts rather than creating new copies.

The runner polls only the active post, once per minute, and does not repeatedly
query sent posts. Buffer's Free API currently allows 100 calls in a rolling
15-minute window. On HTTP 429, stop and honor the returned `Retry-After` seconds
before resuming the same manifest. Never restart or resubmit a pending post to
work around a read quota. API errors now report the retry interval explicitly.

For an explicitly selected large clip, a manifest may provide
`video_overrides: { "SITE-UUID": "https://media.albaalaagh.com/shorts/DERIVATIVE.mp4" }`.
This keeps the stable website source ID and the original website/R2 record while
using a checked smaller copy for TikTok. Check full duration, audio and portrait
dimensions before publishing; do not change the authored caption.

Shared done rows are consumed by `/api/admin/tiktok/done` and the manual
list component. The UI migrates its existing local browser marks once without
overwriting Buffer receipts. The API paginates shared marks beyond 1000 rows.
The dashboard refreshes the shared marks on page load; a queued or pending post
must not receive a completed mark.

The ledger is `/mnt/linuxdata/albaalaagh-buffer-tiktok/ledger.json` (override with
`--ledger`). It uses an exclusive lock and atomic replacement. It records an
attempt BEFORE sending it to Buffer. A timeout/crash leaves `submitting` or
`unknown`; another attempt is blocked. A stale `.lock` also stops the workflow.
Inspect Buffer and the ledger before manually repairing either condition.
Do not delete ledger entries or locks merely to force a retry.

After an operator verifies that the item is absent from TikTok Studio and Buffer
history (or Buffer confirms a request failed before execution), a controlled
retry can use `submit ... --publish --reviewed-retry 'Detailed review note'`.
This preserves the previous attempt in the ledger and repeats the remote duplicate
check. It cannot replace a post with a known Buffer ID. Never use this option
as an automatic response to timeouts.

Known submissions are skipped by channel plus media URL or stable source ID.
Buffer-history checks also block matching video URLs or whitespace-normalized
captions, including the manual test. These checks cannot identify every historic
manual TikTok upload with a changed caption or missing from Buffer history;
verify the selected clip against TikTok Studio before approving a live test.

`scheduled`/`sending` means accepted or queued, not published. `status` saves the
remote state, error, timestamp and TikTok link when available. `sent` confirms
Buffer's delivery; verify public visibility in TikTok as well. Processing can
temporarily show a review/private state. No command changes TikTok privacy.
Buffer's configured timezone currently appeared as Tokyo during setup; choose
the desired channel schedule before queueing, or use explicit immediate posting.

## Validation

For a confirmed delivery failure with a known Buffer post ID, use
`retryFailedPost` from `workflow.mjs` with a detailed review note. It edits that
same post through `editPost`, preserving its stored caption, video and AI
declaration. The live API requires these content fields explicitly when
rescheduling a failed post, despite describing omitted fields as preserved.
Do not create a replacement post or retry a `sending` post. The retry and its
previous error are recorded before mutation. Media download timeouts can occur
after acceptance; a post must reach `sent` before it receives a done mark.
For repeated media download timeouts, a reviewed retry can pass `replacementUrl`
for a verified, smaller public `/shorts/*.mp4` derivative. Preserve the original,
verify full duration and audio, keep the same source ID and Buffer post ID, and
record the derivative URL in retry history. Local optimization artifacts belong
under `/mnt/linuxdata/albaalaagh-buffer-tiktok/optimized/`.

```sh
node --test tools/buffer-tiktok/workflow.test.mjs
node --check scripts/upload-shorts-to-fb-reels.mjs
```

Setup verification used read-only account/channel/history queries, a real website
Short preview, and the exact generated GraphQL mutation with `@skip(if:true)` to
validate the mutation schema without executing it. The first live test exposed
a missing closing brace in the original mutation; it was corrected and covered
by a regression check. The ledger is the authority for current submission status.

API references: [video creation](https://developers.buffer.com/examples/create-video-post.html),
[schema](https://developers.buffer.com/reference.html).

## Explicit TikTok, X and LinkedIn reel batches

`tools/buffer-reels/publish-batch.mjs /absolute/path/publication-manifest.json --plan`
validates the selected local media hashes and captions without remote requests.
`--publish` requires the saved multi-network authorization and quota schedule,
verified YouTube/Meta/R2/website prerequisites, connected channels, daily posting
capacity and API headroom. It records per-destination receipts and stops on
ambiguous outcomes. It never discovers or adds further clips. Batch manifests,
schedules, reports and ledgers remain on the data disk, outside Git.

`npm test` runs the website's Vitest suite and the tools' separate Node test
suite. These automated checks mock external services and do not publish.
