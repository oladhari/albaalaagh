-- ============================================================
-- البلاغ — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Writers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS writers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  title      TEXT NOT NULL,
  bio        TEXT DEFAULT '',
  image_url  TEXT,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Articles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         TEXT UNIQUE NOT NULL,
  title        TEXT NOT NULL,
  excerpt      TEXT DEFAULT '',
  content      TEXT NOT NULL,
  cover_image  TEXT,
  category     TEXT NOT NULL DEFAULT 'سياسة',
  writer_id    UUID REFERENCES writers(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'pending', 'published')),
  published    BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_slug      ON articles(slug);
CREATE INDEX idx_articles_published ON articles(published, published_at DESC);
CREATE INDEX idx_articles_category  ON articles(category);

-- ── News ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  excerpt      TEXT DEFAULT '',
  url          TEXT UNIQUE NOT NULL,
  source       TEXT NOT NULL,
  source_logo  TEXT,
  image_url    TEXT,
  category     TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_status       ON news(status, published_at DESC);
CREATE INDEX idx_news_published_at ON news(published_at DESC);

-- ── Guests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  title      TEXT NOT NULL,
  bio        TEXT DEFAULT '',
  image_url  TEXT,
  category   TEXT NOT NULL DEFAULT 'آخر'
               CHECK (category IN ('وزير','برلماني','ناشط','مفكر','صحفي','أكاديمي','آخر')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────
-- Public read access for published content
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE news     ENABLE ROW LEVEL SECURITY;
ALTER TABLE writers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests   ENABLE ROW LEVEL SECURITY;

-- Anyone can read published articles
CREATE POLICY "public_read_articles" ON articles
  FOR SELECT USING (published = TRUE);

-- Anyone can read approved news
CREATE POLICY "public_read_news" ON news
  FOR SELECT USING (status = 'approved');

-- Anyone can read writers and guests
CREATE POLICY "public_read_writers" ON writers FOR SELECT USING (TRUE);
CREATE POLICY "public_read_guests"  ON guests  FOR SELECT USING (TRUE);

-- Service role key bypasses RLS (used by admin API routes)
-- No additional policies needed for service role

-- ── Writer Articles (auto-fetched from external sources) ─────
CREATE TABLE IF NOT EXISTS writer_articles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  excerpt      TEXT DEFAULT '',
  url          TEXT UNIQUE NOT NULL,
  image_url    TEXT,
  writer_name  TEXT NOT NULL,
  source       TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_writer_articles_writer     ON writer_articles(writer_name, published_at DESC);
CREATE INDEX idx_writer_articles_status     ON writer_articles(status, published_at DESC);

ALTER TABLE writer_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_writer_articles" ON writer_articles
  FOR SELECT USING (status != 'rejected');

-- ── Sample data (optional, remove in production) ─────────────
INSERT INTO writers (name, title, bio) VALUES
  ('د. محمد العربي', 'أستاذ العلوم السياسية', 'أستاذ متخصص في العلوم السياسية والعلاقات الدولية، يكتب عن الديمقراطية والتحولات السياسية في العالم العربي.'),
  ('الشيخ عبدالله التونسي', 'عالم وفقيه', 'عالم إسلامي متخصص في فقه السياسة الشرعية وإشكاليات الحوكمة المعاصرة.'),
  ('أ. سامي الوسلاتي', 'خبير اقتصادي', 'خبير في الاقتصاد السياسي والتنمية، له مساهمات في كبريات المطبوعات العربية.');
