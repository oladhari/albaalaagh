# البلاغ — موقع قناة البلاغ

منبر إعلامي تونسي مستقل. موقع Next.js 16 مع Supabase وتصميم عربي RTL.

---

## التقنيات المستخدمة

- **Next.js 16** (App Router) — يتطلب Node.js 20+
- **Tailwind CSS v4** (إعداد CSS فقط، لا يوجد tailwind.config.js)
- **Supabase** — قاعدة بيانات PostgreSQL + مصادقة Auth
- **Cloudflare R2** — تخزين الفيديوهات والصور على `media.albaalaagh.com`
- **Resend** — إرسال البريد الإلكتروني (نشرة + تواصل)
- **Stripe** — نظام الدعم المالي (اشتراك / تبرع) عبر `/support`
- **rss-parser** — جلب الأخبار من مصادر RSS
- **Anthropic SDK (Claude Haiku)** — تصنيف الأخبار جغرافياً وموضوعياً (~$0.36/شهر)
- **Cairo** — خط عربي من Google Fonts

---

## متطلبات الإعداد

### 1. Node.js

يتطلب المشروع Node.js 20 أو أحدث:

```bash
nvm install 20.9.0
nvm use 20.9.0
```

### 2. متغيرات البيئة

انسخ `.env.example` إلى `.env.local` واملأ القيم:

```env
NEXT_PUBLIC_SUPABASE_URL=         # من Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # المفتاح العام (publishable)
SUPABASE_SERVICE_ROLE_KEY=        # مفتاح الخدمة (سري، لا تشاركه)
RESEND_API_KEY=                   # من resend.com
CRON_SECRET=                      # كلمة سرية لحماية endpoint الجدولة
ADMIN_PASSWORD=                   # كلمة مرور لوحة الإدارة /admin/login
NEXT_PUBLIC_SITE_URL=             # https://albaalaagh.com في الإنتاج
STRIPE_SECRET_KEY=                # من Stripe Dashboard → API Keys
STRIPE_WEBHOOK_SECRET=            # من Stripe Dashboard → Webhooks
R2_ACCOUNT_ID=                    # من Cloudflare R2
R2_ACCESS_KEY_ID=                 # Cloudflare R2 API Token
R2_SECRET_ACCESS_KEY=             # Cloudflare R2 API Token
R2_BUCKET_NAME=                   # اسم الـ bucket (albaalaagh)
R2_PUBLIC_URL=                    # https://media.albaalaagh.com
```

### 3. قاعدة البيانات (Supabase)

شغّل `supabase-schema.sql` كاملاً في **Supabase → SQL Editor**.

#### جداول إضافية (أضفها إذا لم تكن موجودة)

```sql
-- البرامج / القوائم
CREATE TABLE IF NOT EXISTS playlists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- فيديوهات الموقع (من R2، ليس YouTube)
CREATE TABLE IF NOT EXISTS site_videos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  video_url     TEXT NOT NULL,
  thumbnail_url TEXT,
  published     BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  playlist_id   UUID REFERENCES playlists(id),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- مشتركو النشرة البريدية المجانية
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             TEXT UNIQUE NOT NULL,
  name              TEXT,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  unsubscribe_token TEXT DEFAULT gen_random_uuid()::text UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON newsletter_subscribers(email);
CREATE INDEX ON newsletter_subscribers(unsubscribe_token);

-- مشتركو الدعم المالي (Stripe)
CREATE TABLE IF NOT EXISTS subscribers (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                  TEXT NOT NULL,
  name                   TEXT,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan                   TEXT,
  amount                 INTEGER,
  currency               TEXT,
  status                 TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);
```

#### تحديثات على جداول موجودة

```sql
-- إضافة عمود status لجدول articles
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'published'));
UPDATE articles SET status = 'published' WHERE published = true;

-- إضافة عمود user_id لجدول writers
ALTER TABLE writers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- إضافة عمود geo للأخبار
ALTER TABLE news ADD COLUMN IF NOT EXISTS geo TEXT DEFAULT 'general'
  CHECK (geo IN ('tunisia', 'arab', 'international', 'general'));

-- جدول مقالات الكتّاب
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
CREATE INDEX IF NOT EXISTS idx_writer_articles_writer ON writer_articles(writer_name, published_at DESC);
ALTER TABLE writer_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_writer_articles" ON writer_articles
  FOR SELECT USING (status != 'rejected');
```

---

## مخطط قاعدة البيانات

لعرض جميع الجداول والأعمدة محلياً (لا يُحفظ في git):

```bash
curl -s "https://vtsadbazsctspncausha.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0c2FkYmF6c2N0c3BuY2F1c2hhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4NDYyMCwiZXhwIjoyMDkxNjYwNjIwfQ.k2WGO2r6lFwppPWI8Xy9V8mzti_m14b5lVAvlekv-TA" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const defs = d.definitions;
const lines = ['# Supabase Schema — albaalaagh\n'];
for (const [tableName, def] of Object.entries(defs).sort()) {
  lines.push('## ' + tableName);
  const props = def.properties ?? {};
  const required = def.required ?? [];
  for (const [col, info] of Object.entries(props)) {
    const type = info.format ?? info.type ?? '?';
    const req = required.includes(col) ? ' NOT NULL' : '';
    lines.push('  ' + col + ': ' + type + req);
  }
  lines.push('');
}
console.log(lines.join('\n'));
" > schema.md && echo "schema.md updated"
```

الملف `schema.md` في `.gitignore` — راجعه قبل كتابة أي سكريبت يُدرج بيانات في قاعدة البيانات.

---

## إنشاء حسابات الكتّاب

**1. إنشاء حساب في Supabase Auth:**

- Supabase Dashboard → Authentication → Users → **Invite user**

**2. ربط الحساب بملف الكاتب:**

```sql
UPDATE writers
SET user_id = 'PASTE-USER-UID-HERE'
WHERE name = 'اسم الكاتب الكامل';
```

**3. دخول الكاتب:** `https://albaalaagh.com/writer/login`

---

## تشغيل المشروع محلياً

```bash
npm install
npm run dev
```

يعمل على `http://localhost:3000`

---

## ميزات الموقع الحالية

### الصفحات العامة

| الصفحة | الوصف |
|--------|-------|
| `/` | الرئيسية: بث مباشر (Twitch)، بطاقات البرامج، أخبار، مقالات |
| `/interviews` | أرشيف الحلقات مع فلتر حسب البرنامج + مشغّل فيديو |
| `/videos/[id]` | صفحة مشاركة فيديو فردي |
| `/news` | أخبار مصنّفة (تونس / عربي / دولي) |
| `/articles` | مقالات الموقع |
| `/guests` | ضيوف القناة |
| `/support` | صفحة الدعم المالي (Stripe) |
| `/about` | عن القناة |

### لوحة الإدارة `/admin`

| القسم | الوصف |
|-------|-------|
| `/admin/videos` | إدارة الفيديوهات مع إسناد البرامج |
| `/admin/playlists` | إدارة البرامج (إنشاء / تعديل / ترتيب) |
| `/admin/newsletter` | تأليف وإرسال النشرة الأسبوعية |
| `/admin/articles` | إدارة المقالات ومراجعة المُرسَلة |
| `/admin/news` | اعتماد الأخبار ونشرها |
| `/admin/guests` | إدارة بيانات الضيوف |
| `/admin/writers` | إدارة حسابات الكتّاب |
| `/admin/ytfb` | مشاركة فيديو من أي منصة على فيسبوك |

### النشرة البريدية

- **اشتراك مجاني:** نموذج في أسفل كل صفحة `/api/newsletter/subscribe`
- **إلغاء الاشتراك:** رابط شخصي في كل بريد `/api/newsletter/unsubscribe?token=xxx`
- **الإرسال:** من `/admin/newsletter` — يُرسل للمشتركين المجانيين + الداعمين معاً مع إزالة التكرار

### الدعم المالي (Stripe)

- صفحة `/support` مع خيارات تبرع
- `/api/stripe/checkout` — جلسة دفع
- `/api/webhooks/stripe` — تحديث حالة الاشتراك تلقائياً

---

## استيراد الفيديوهات

### استيراد أرشيف X (تويتر) — 2189 بث مباشر

```bash
# تشغيل السكريبت (يستأنف تلقائياً عند الإيقاف)
nohup node scripts/import-twitter-broadcasts.mjs /path/to/twitter-archive > /tmp/twitter-broadcasts.log 2>&1 &

# متابعة التقدم
tail -f /tmp/twitter-broadcasts.log

# عدد المنتهية
cat /tmp/twitter-broadcasts-progress.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.length,'done')"
```

- يُحمّل بجودة 480p (replay-1200)
- يكتشف البرنامج من عنوان التغريدة (قبل `|`)
- يُسند `published_at` من تاريخ التغريدة الأصلية
- يُعيد المحاولة بـ `--fragment-retries infinite` لتجاوز مشاكل الشبكة

### استيراد تسجيلات فيسبوك (38 حلقة — مايو/جوان 2026)

```bash
# تشغيل السكريبت
nohup node scripts/import-facebook-videos.mjs > /tmp/facebook-videos.log 2>&1 &

# متابعة التقدم
tail -f /tmp/facebook-videos.log
```

- يقرأ من `facebook-events-backup.json` (700 حدث محفوظ محلياً)
- يتحقق من كل حدث عبر yt-dlp — الأحداث قبل مايو 2026 محذوفة من فيسبوك
- يُحمّل بجودة 720p
- يُسند البرنامج تلقائياً من العنوان

### رفع أرشيف Odysee (661 فيديو)

```bash
node scripts/upload-odysee.mjs >> /tmp/odysee-upload.log 2>&1 &
tail -5 /tmp/odysee-upload.log
```

### إثراء الفيديوهات من فيسبوك (صور + وصف)

```bash
# يقرأ من facebook-events-backup.json ويُحدّث الفيديوهات الناقصة
node scripts/enrich-from-facebook.mjs
```

---

## مشاركة فيديو على فيسبوك (محلي فقط)

الأداة موجودة في `/admin/ytfb` — تحمّل الفيديو من أي رابط وتنشره على صفحة البلاغ في فيسبوك.

**المتطلبات:**
```env
FB_PAGE2_ID=       # معرّف الصفحة
FB_PAGE2_TOKEN=    # رمز الوصول للصفحة
```

> **لماذا محلي فقط؟** — yt-dlp لا يعمل من Vercel/AWS بسبب قيود YouTube.

---

## جلب الأخبار (Cron Job)

```bash
# يدوياً
curl -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron/fetch-news
```

يُصنّف Claude Haiku كل خبر بـ `geo` و`category` تلقائياً. التكلفة ~$0.36/شهر.

---

## النشر على Vercel

1. ارفع المشروع على GitHub
2. في Vercel: **New Project** → استورد الـ repo
3. أضف جميع متغيرات `.env.local` في **Environment Variables**
4. في **Domains**: أضف `albaalaagh.com`
5. في Supabase → Authentication → **URL Configuration**: أضف `https://albaalaagh.com`
6. في Stripe → Webhooks: أضف `https://albaalaagh.com/api/webhooks/stripe`

> الـ push إلى `main` يُشغّل Deploy تلقائياً عبر Git integration.

---

## هيكل المشروع

```
src/
├── app/
│   ├── (site)/          # الصفحات العامة
│   │   ├── interviews/  # أرشيف الحلقات مع فلتر البرامج
│   │   ├── videos/[id]/ # صفحة فيديو فردي
│   │   ├── support/     # صفحة الدعم المالي
│   │   └── ...
│   ├── admin/           # لوحة الإدارة
│   ├── writer/          # منصة الكتّاب
│   └── api/
│       ├── admin/newsletter/  # بيانات + إرسال النشرة
│       ├── newsletter/        # اشتراك + إلغاء اشتراك عام
│       ├── stripe/            # checkout session
│       └── webhooks/stripe/   # أحداث Stripe
├── components/
│   ├── layout/          # Navbar, Footer, YoutubeBanner
│   ├── sections/        # PlaylistsSection, SiteVideosSection, SocialBar...
│   └── ui/              # SiteVideoCard, SiteVideoModal, NewsletterForm...
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts
│   └── utils.ts
└── types/index.ts       # أنواع البيانات، SOCIAL_LINKS، فئات المحتوى
scripts/
├── import-twitter-broadcasts.mjs  # استيراد 2189 بث من أرشيف X
├── import-facebook-videos.mjs     # استيراد تسجيلات فيسبوك
├── enrich-from-facebook.mjs       # إثراء الفيديوهات بصور وأوصاف
└── upload-odysee.mjs              # رفع أرشيف Odysee
facebook-events-backup.json        # نسخة احتياطية من 700 حدث فيسبوك (محلي)
schema.md                          # مخطط قاعدة البيانات (محلي، في .gitignore)
```
