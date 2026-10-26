# News publishing through Buffer

The existing news publish button still publishes to the website, Facebook,
Instagram and Telegram. Only news (`type: news`) now uses Buffer for X and
LinkedIn, instead of the direct adapters. Other editorial and reels paths are
unchanged by this change.

Server-only configuration (also required on the production host):
- `BUFFER_TIKTOK_API`: existing shared Buffer API key, read from the environment.
- `BUFFER_X_CHANNEL_ID`: connected Albaalaagh X channel ID.
- `BUFFER_LINKEDIN_CHANNEL_ID`: connected Albaalaagh LinkedIn Page channel ID.

The adapter trims whitespace from the API key and channel IDs before use, including
trailing newlines introduced by hosting environment-variable input. Configure
these values without trailing line breaks.

Both Buffer posts use `shareNow`, the exact `facebook_image` square asset,
platform-sized text, the complete canonical article URL, and hashtags. A missing
square image produces a logged failure for Buffer without falling back to the
landscape image or the direct X/LinkedIn adapters. The other destinations run
independently.

`src/lib/buffer-news.ts` atomically inserts one `site_settings` receipt per news
source and destination, keyed by `buffer_news:` plus a hash. CMS news IDs remain
stable if the publish endpoint generates a new slug. Receipts record accepted
Buffer IDs and delivery states. Concurrent clicks, known failures, timeouts and
unknown outcomes never cause automatic duplicate submissions. A post is recorded
as sent only when Buffer returns `sent` and a delivery link.

The authenticated `/api/cron/sync-buffer-news` route checks pending known Buffer
IDs every 30 minutes. It only reads delivery status; it never publishes or
retries. `CRON_SECRET` is required. Investigate `unknown` or `error` receipts
before any manual retry; inspect the source, channel and Buffer dashboard first.

The two successful October 27 connection-test posts were imported into this
receipt store so publishing that same news item again will not duplicate them.

Validation: caption/link preservation; square-image requirement; atomic duplicate
protection; unknown outcome handling; independent destinations; pending-only
status reconciliation; dispatch bypasses direct X/LinkedIn only for news.
