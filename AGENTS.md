<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Albaalaagh multi-root workspace

Also read the canonical cross-project workstation instructions at
`/home/oladhari/Documents/albaalaagh-workstation/AGENTS.md`. The rules in this
repository remain authoritative for website, secrets, storage, and publishing
work if the two instruction sets overlap.

# Never leak secrets into tracked files

Never write a real API key, token, JWT, service_role key, or any other `.env*` value into README.md, code comments, docs, scripts, or any other file that gets committed/pushed — even temporarily, even in an example. This happened once (a live Supabase `service_role` JWT hardcoded in a README curl example, sitting in a public repo) and must never happen again.

- Env values referenced in docs or scripts must be read from the environment (`$VAR_NAME`, `process.env.VAR_NAME`, `source .env.local && ...`) — never inlined as literal values.
- Before committing/pushing, check the actual diff content (not just filenames) for anything that looks like a secret — long base64/JWT-looking strings, `sk_`/`sb_secret_`/`AKIA`-style prefixes, tokens copy-pasted from a dashboard.
- If a secret is ever found already committed, treat the key as compromised: it must be rotated at the source (Supabase/Meta/etc.), not just deleted from the current file — git history still has it until scrubbed separately.

# Private R2 archive bucket (hidden storage)

There are two R2 buckets. `albaalaagh` is **public** (`media.albaalaagh.com` is bound to the whole bucket, so every prefix in it is public). `albaalaagh-private-archive` is **private** (no custom domain, no `r2.dev`).

## YouTube migration visibility rule (user-approved)

This rule is authoritative and must not be inferred from a checker rating:

- A video that is **public on YouTube** migrates to the **public** `albaalaagh`
  R2 bucket and may remain visible on albaalaagh.com when migration is
  explicitly requested.
- A video that is **private on YouTube** migrates only to
  `albaalaagh-private-archive` and must not be exposed on the website.
- `medium`/`high` checker results set the urgency for removing a video from
  YouTube. They do **not** change a formerly public video's destination to the
  private archive.
- Preserve the original title, full description, publication date, thumbnail,
  and named playlist membership when replacing the YouTube source with R2.
- Verify the complete R2 object and the albaalaagh.com database record before
  the corresponding YouTube video is deleted.

- Credentials are `R2_ARCHIVE_ACCESS_KEY_ID`, `R2_ARCHIVE_SECRET_ACCESS_KEY` and `R2_ARCHIVE_BUCKET` in `.env.local` (same rules as above: never inline the values anywhere). The token is scoped to the archive bucket only.
- Never enable public access, a custom domain or `r2.dev` on the archive bucket.
- Upload with `node --env-file=.env.local scripts/archive-to-private-r2.mjs <dir>` (`/scripts` is git-ignored, so this script exists locally only).
- Anything from the private archive must still be re-checked and explicitly
  approved before publication.
- Full procedure, batch list, retrieval with signed links and rotation: `docs/private-r2-archive.md`.

# TikTok through Buffer

Use `tools/buffer-tiktok/cli.mjs` for selected existing website Shorts and
`tools/buffer-tiktok/batch.mjs` for explicitly selected finite batches. Credentials
come from `BUFFER_TIKTOK_API` in `.env.local`. Publication requires explicit
TikTok scope; the regular `/reels` destinations do not implicitly include it.
The local reels publisher supports the opt-in `--with-tiktok` handoff.

Mark a clip done only after confirmed delivery, using its `tiktok_done:UUID`
record in `site_settings`. Preserve browser manual marks during migration.
Durable ledgers and batch selections live in
`/mnt/linuxdata/albaalaagh-buffer-tiktok/`. Never blindly retry an unknown
submission. Workflow, retry review and deployment details:
[`docs/buffer-tiktok.md`](docs/buffer-tiktok.md).
