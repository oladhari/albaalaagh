# Video source consolidation

The YouTube URL is a fallback while a video is waiting to be copied to R2. Once
the R2 copy exists, the database should contain one published video row whose
`video_url` points to R2.

## Safety rules

- Match records only by the exact 11-character YouTube video ID.
- Keep the oldest database row and its public `/videos/<id>` URL.
- Replace its media URL with the R2 URL and retain the best available metadata.
- Redirect the retired row ID permanently to the canonical row.
- Delete only the redundant Supabase row. Never delete an R2 object.
- Skip groups that are not exactly one YouTube row and one R2 row.

## Running the consolidation

Apply `supabase/migrations/20260917180000_video_source_consolidation.sql` first.
Then inspect a dry run:

```bash
npm run videos:consolidate
```

The command writes a full audit file under `/tmp`. After reviewing the counts,
apply the safe pairs:

```bash
npm run videos:consolidate -- --apply
```

The apply mode updates the canonical row, writes the redirect, and removes the
redundant database row. It has no Cloudflare R2 delete operation.
