# Private R2 archive

There are **two** R2 buckets. Do not confuse them.

| Bucket | Public? | Used for |
| --- | --- | --- |
| `albaalaagh` | **Yes**: `media.albaalaagh.com` is bound to the whole bucket | Everything the site, Facebook and Instagram serve (shorts, videos, covers, thumbnails, news images) |
| `albaalaagh-private-archive` | **No**: no custom domain, no `r2.dev` URL | Content that must stay hidden but must not be lost |

A custom domain applies to a whole bucket, so a "secret" prefix or an obscure
filename inside `albaalaagh` is still public. Hidden content goes in the
private bucket, never in the public one.

## What belongs in the archive

- Videos removed from YouTube (for example private videos deleted because
  private videos can still be reported) that should be kept.
- Videos kept secret on purpose, never shown on the channel or site.
- Anything the community-guideline checker rates `medium` or `high` that is
  worth keeping. Videos rated `high` must never go to the site, Facebook or
  Instagram; Meta's Dangerous Organizations policy is as strict as YouTube's.

Publishing an archived video means re-checking it first
(`scripts/community-guideline-checker/`), then copying it to the public bucket
through the normal `/reels` or admin flow. Copy it, do not move it: the archive
copy stays.

## Layout

Each batch goes under its own dated prefix:

```
youtube-private-YYYY-MM-DD/<original filename>
youtube-private-YYYY-MM-DD/_manifest.json
```

Files are stored byte for byte with their original names. Every object carries
its local sha256 as metadata (`x-amz-meta-sha256`).

### Batches

| Prefix | Files | Size | Notes |
| --- | --- | --- | --- |
| `youtube-private-2026-09-20/` | 40 | 2948.0 MB | Former private YouTube videos, including intros/outros and music-only clips. Every object was verified by size and sha256 after upload. |

Add a row here for each new batch.

## Credentials

Stored only in `.env.local` (git-ignored). Never write the values into a
tracked file, see the "Never leak secrets" rule in `AGENTS.md`.

```
R2_ARCHIVE_ACCESS_KEY_ID
R2_ARCHIVE_SECRET_ACCESS_KEY
R2_ARCHIVE_BUCKET=albaalaagh-private-archive
R2_ENDPOINT            # shared with the public bucket: the account's default endpoint
```

The token is Cloudflare **Object Read & Write, restricted to
`albaalaagh-private-archive` only**. It is refused (HTTP 403) on the public
bucket and cannot list or create buckets. To rotate it: R2, then Manage API
tokens, then Roll, then update `.env.local`.

If the credentials are lost, create a new Object Read & Write token scoped to
this one bucket. The bucket and its contents are not affected.

## Archiving a folder

The script lives at `scripts/archive-to-private-r2.mjs`. `/scripts` is
git-ignored in this repo, so it exists on the maintainer's machine only and is
not in git. If it is missing, rebuild it from the behaviour below.

```
node --env-file=.env.local scripts/archive-to-private-r2.mjs <dir> --dry-run   # list and hash only
node --env-file=.env.local scripts/archive-to-private-r2.mjs <dir>             # upload
```

Behaviour:

- Uploads every file in `<dir>` under `youtube-private-<today>/` (override with
  `--prefix=`). Files over 32 MB use multipart upload.
- After each file, checks the remote size and sha256 against the local file.
- Skips objects already present with the same size and sha256, so re-running
  is safe.
- Refuses to run if `R2_ARCHIVE_BUCKET` is the public bucket.
- Never modifies, moves or deletes the source folder.
- Writes a manifest (file, size, sha256) **outside the repo**, next to the
  folder (`<folder>-archive-manifest-<date>.json`), and a copy into the bucket
  as `_manifest.json`. The manifest holds video titles, so it must not be
  committed.

## Verifying

Compare the bucket against the manifest: list the prefix with the archive
credentials and check that the object count and total size match. The
`_manifest.json` in each prefix lists the expected sha256 for every file.

## Retrieving a file

Use a time-limited signed link. The bucket has no public URL, so an unsigned
request is rejected (HTTP 400).

```js
import { AwsClient } from "aws4fetch";
const c = new AwsClient({
  accessKeyId: process.env.R2_ARCHIVE_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_ARCHIVE_SECRET_ACCESS_KEY,
  service: "s3", region: "auto",
});
const url = new URL(`${process.env.R2_ENDPOINT}/${process.env.R2_ARCHIVE_BUCKET}/youtube-private-2026-09-20/<filename>`);
url.searchParams.set("X-Amz-Expires", "600"); // seconds
const { url: signed } = await c.sign(url, { method: "GET", aws: { signQuery: true } });
// fetch(signed) or open it in a browser; the link stops working after 10 minutes
```

Run it with `node --env-file=.env.local`. Do not paste signed links anywhere
public.

## Rules

- Never enable public access, a custom domain or `r2.dev` on
  `albaalaagh-private-archive`. Doing so would expose every archived video.
- Never put archive credentials in tracked files, docs, chat or CI logs.
- Keep a second copy outside R2 (local disk or an external drive) for anything
  irreplaceable.
- Never delete an archive object unless the user asks for that specific file.
