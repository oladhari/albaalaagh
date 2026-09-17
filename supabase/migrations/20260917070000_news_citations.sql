ALTER TABLE news
  ADD COLUMN IF NOT EXISTS source_language TEXT
    CHECK (source_language IN ('ar', 'en')),
  ADD COLUMN IF NOT EXISTS source_kind TEXT
    CHECK (source_kind IN ('official', 'agency', 'media', 'emergency', 'science')),
  ADD COLUMN IF NOT EXISTS source_topic TEXT
    CHECK (source_topic IN ('tunisia', 'arab', 'international', 'technology', 'disaster')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS news_citations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_id      UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'media'
                 CHECK (kind IN ('official', 'agency', 'media', 'document', 'interview')),
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (news_id, url)
);

CREATE INDEX IF NOT EXISTS idx_news_citations_news_id
  ON news_citations(news_id);

ALTER TABLE news_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read citations for approved news"
  ON news_citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM news
      WHERE news.id = news_citations.news_id
        AND news.status = 'approved'
    )
  );
