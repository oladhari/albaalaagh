# YouTube website sync

The production job `/api/cron/sync-youtube-videos` runs at 00:00 and 12:00 UTC.
It reads public uploads using the website API key; it never changes YouTube
videos, privacy, metadata, or thumbnails. Explicit public visibility is required
before a fetched video can become a website candidate.

## Quota and recovery

One shared client caps each invocation at **160 YouTube list requests**, including
channel metadata, upload pagination/details, playlist names and membership. All
YouTube requests are sequential, have a 15-second timeout, and are not retried.
A 180-second work deadline reserves time to save progress before the function timeout.
Logs/JSON include `youtubeRequests`, `youtubeRequestsByMethod`,
`youtubeRequestLimit`, `playlistScanComplete`, warnings and safe HTTP/reason codes.
URLs, API keys and raw upstream messages are never logged by this client.

The job checks existing database assignments first. It looks up membership only
for new or unassigned candidates, preserving existing programme assignments and
archived R2 media URLs. Historical membership, rotating playlist positions, and
older-page cursors persist in the existing `site_settings` text value under
`youtube_sync_checkpoint_v1`; no migration or new credentials are needed.

Recent playlist pages are checked first; older pages advance round-robin within
the remaining budget. Heads rotate when the budget cannot cover all playlists.
Unresolved programme assignments may be filled by subsequent runs, rather than
causing a fresh full-history crawl. Repeated page tokens are stopped; expired
cursors restart on a later run. A deleted/unavailable playlist does not abort
other playlist checks. Historical membership is refreshed as cursor cycles finish.

Quota errors stop further API requests and persist a pause until the next
midnight in `America/Los_Angeles` (including daylight-saving changes). Auth/403
errors pause for an hour. Calls during a persisted pause make **zero YouTube
requests**. A checkpoint read failure also fails closed before any API work.
If an optional playlist phase fails, already fetched public uploads can still be
imported and their assignments repaired later. Failure in the required upload
phase reports an error without inventing an empty successful import.

## Verification and resumption

Do not repeatedly invoke the job while quota is exhausted. A deployed release
can be checked with an unauthenticated request (expected 401), without API calls
or content changes. Inspect the next scheduled run's structured logs after reset.
A cooldown does not replenish spent quota or resume separate local upload batches.
Do not delete the checkpoint as routine recovery: it discards historical progress.

Tests cover request caps, terminal-error circuit breaking, safe errors, persisted
cooldowns, rotating/resumable scans, repeated/expired tokens, public visibility,
batched imports, and preservation of archived media. Use:

    npx vitest run src/lib/__tests__/youtube-sync*.test.ts
