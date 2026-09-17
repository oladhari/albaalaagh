ALTER TABLE site_videos
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;

CREATE INDEX IF NOT EXISTS idx_site_videos_youtube_video_id
  ON site_videos(youtube_video_id)
  WHERE youtube_video_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS video_redirects (
  old_id       UUID PRIMARY KEY,
  canonical_id UUID NOT NULL REFERENCES site_videos(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (old_id <> canonical_id)
);

CREATE INDEX IF NOT EXISTS idx_video_redirects_canonical_id
  ON video_redirects(canonical_id);

ALTER TABLE video_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read video redirects"
  ON video_redirects FOR SELECT
  USING (TRUE);
