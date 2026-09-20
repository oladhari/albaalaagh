<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Never leak secrets into tracked files

Never write a real API key, token, JWT, service_role key, or any other `.env*` value into README.md, code comments, docs, scripts, or any other file that gets committed/pushed — even temporarily, even in an example. This happened once (a live Supabase `service_role` JWT hardcoded in a README curl example, sitting in a public repo) and must never happen again.

- Env values referenced in docs or scripts must be read from the environment (`$VAR_NAME`, `process.env.VAR_NAME`, `source .env.local && ...`) — never inlined as literal values.
- Before committing/pushing, check the actual diff content (not just filenames) for anything that looks like a secret — long base64/JWT-looking strings, `sk_`/`sb_secret_`/`AKIA`-style prefixes, tokens copy-pasted from a dashboard.
- If a secret is ever found already committed, treat the key as compromised: it must be rotated at the source (Supabase/Meta/etc.), not just deleted from the current file — git history still has it until scrubbed separately.

# Private R2 archive bucket (hidden storage)

There are two R2 buckets. `albaalaagh` is **public** (`media.albaalaagh.com` is bound to the whole bucket, so every prefix in it is public). `albaalaagh-private-archive` is **private** (no custom domain, no `r2.dev`).

- Anything that must stay hidden (videos deleted from YouTube but kept, videos kept secret, content rated medium/high by `scripts/community-guideline-checker/`) goes **only** in the private bucket. Never put it in the public bucket, not even under an obscure prefix.
- Credentials are `R2_ARCHIVE_ACCESS_KEY_ID`, `R2_ARCHIVE_SECRET_ACCESS_KEY` and `R2_ARCHIVE_BUCKET` in `.env.local` (same rules as above: never inline the values anywhere). The token is scoped to the archive bucket only.
- Never enable public access, a custom domain or `r2.dev` on the archive bucket.
- Upload with `node --env-file=.env.local scripts/archive-to-private-r2.mjs <dir>` (`/scripts` is git-ignored, so this script exists locally only).
- Videos rated `high` are never published to the site, Facebook or Instagram. Anything from the archive must be re-checked before it is published.
- Full procedure, batch list, retrieval with signed links and rotation: `docs/private-r2-archive.md`.
