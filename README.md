# البلاغ — موقع قناة البلاغ

منبر إعلامي تونسي مستقل. موقع Next.js 16 مع Supabase وتصميم عربي RTL.

---

## التقنيات المستخدمة

- **Next.js 16** (App Router) — يتطلب Node.js 20+
- **Tailwind CSS v4** (إعداد CSS فقط، لا يوجد tailwind.config.js)
- **Supabase** — قاعدة بيانات PostgreSQL + مصادقة Auth
- **Resend** — إرسال البريد الإلكتروني من نموذج التواصل
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
YOUTUBE_API_KEY=                  # من Google Cloud Console → YouTube Data API v3
RESEND_API_KEY=                   # من resend.com (لإرسال رسائل التواصل)
CRON_SECRET=                      # كلمة سرية لحماية endpoint الجدولة
ADMIN_PASSWORD=                   # كلمة مرور لوحة الإدارة /admin/login
NEXT_PUBLIC_SITE_URL=             # https://albaalaagh.com في الإنتاج
```

### 3. قاعدة البيانات (Supabase)

شغّل `supabase-schema.sql` كاملاً في **Supabase → SQL Editor**.

ثم شغّل هذه الأوامر لتحديث الجداول الموجودة (إذا أنشأت الجداول مسبقاً):

```sql
-- إضافة عمود status لجدول articles
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'published'));

-- تصحيح المقالات المنشورة مسبقاً
UPDATE articles SET status = 'published' WHERE published = true;

-- إضافة عمود user_id لجدول writers (ربط بحسابات المصادقة)
ALTER TABLE writers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- تحديث سياسة القراءة العامة للمقالات
DROP POLICY IF EXISTS "public_read_articles" ON articles;
CREATE POLICY "public_read_articles" ON articles
  FOR SELECT USING (status = 'published');

-- إضافة عمود geo لتصنيف الأخبار جغرافياً (مطلوب)
ALTER TABLE news ADD COLUMN IF NOT EXISTS geo TEXT DEFAULT 'general'
  CHECK (geo IN ('tunisia', 'arab', 'international', 'general'));

-- جدول مقالات الكتّاب (auto-fetch — اختياري)
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
CREATE INDEX IF NOT EXISTS idx_writer_articles_status ON writer_articles(status, published_at DESC);
ALTER TABLE writer_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_writer_articles" ON writer_articles
  FOR SELECT USING (status != 'rejected');
```

---

## إنشاء حسابات الكتّاب

كل كاتب يحصل على حساب للدخول إلى `/writer` وكتابة مقالاته.

### الخطوات:

**1. إنشاء حساب في Supabase Auth:**

- Supabase Dashboard → Authentication → Users → **Invite user**
- أدخل البريد الإلكتروني للكاتب
- سيصله رابط لتعيين كلمة المرور

**2. ربط الحساب بملف الكاتب:**

بعد إنشاء الحساب، انسخ الـ User UID من قائمة المستخدمين، ثم شغّل:

```sql
UPDATE writers
SET user_id = 'PASTE-USER-UID-HERE'
WHERE name = 'اسم الكاتب الكامل';
```

**3. دخول الكاتب:**

الكاتب يدخل من: `https://albaalaagh.com/writer/login`

### صلاحيات الكاتب:
- كتابة مقالات وحفظها كمسودة
- إرسال المقال للمراجعة (يظهر في لوحة الإدارة)
- تعديل المسودات والمقالات المعلّقة
- لا يستطيع نشر مقالاته مباشرة

### صلاحيات الإدارة:
- مراجعة المقالات المرسلة في `/admin/articles?tab=pending`
- النشر بضغطة زر واحدة
- إضافة مقالات مباشرة عبر `/admin/articles/new`

---

## تشغيل المشروع محلياً

```bash
npm install
npm run dev
```

يعمل على `http://localhost:3000`

---

## جلب الأخبار (Cron Job)

جلب الأخبار من مصادر RSS يدوياً:

```bash
curl -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron/fetch-news
```

في Vercel، أضف Cron Job في `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-news",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

وأضف header المصادقة في إعدادات Vercel أو استخدم `CRON_SECRET` في البيئة.

### تصنيف الأخبار بالذكاء الاصطناعي

كل مرة يُشغَّل الـ cron، يُرسَل طلب واحد فقط إلى Claude Haiku يحتوي على جميع العناوين الجديدة دفعةً واحدة. Haiku يصنّف كل خبر بـ:

- **geo**: `tunisia` (تونس) | `arab` (الوطن العربي) | `international` (دولي) | `general`
- **category**: سياسة | اقتصاد | قضاء | أمن | مجتمع | دولي | ثقافة | رياضة

**التكلفة التقديرية:** ~$0.003 لكل استدعاء، أي **~$0.36/شهر** عند التشغيل 4 مرات يومياً.

في حال فشل الاستدعاء، يعود النظام تلقائياً إلى تصنيف قاعدي بالكلمات المفتاحية.

### تصحيح الأخبار الموجودة (تشغيل مرة واحدة)

إذا كانت الأخبار القديمة في قاعدة البيانات بدون تصنيف جغرافي، شغّل هذا في Supabase SQL Editor:

```sql
-- تصنيف الأخبار التونسية حسب المصدر
UPDATE news SET geo = 'tunisia'
  WHERE source IN ('تيوميديا', 'موزاييك FM', 'نواة')
  AND (geo IS NULL OR geo = 'general');

-- تصنيف الأخبار العربية حسب المصدر
UPDATE news SET geo = 'arab'
  WHERE source IN ('عربي21', 'الجزيرة', 'العربي الجديد', 'القدس العربي')
  AND (geo IS NULL OR geo = 'general');
```

---

## النشر على Vercel

1. ارفع المشروع على GitHub
2. في Vercel: **New Project** → استورد الـ repo
3. أضف جميع متغيرات `.env.local` في **Environment Variables**
4. في **Domains**: أضف `albaalaagh.com` واتبع تعليمات DNS
5. في Supabase → Authentication → **URL Configuration**: أضف `https://albaalaagh.com` في Redirect URLs

---

## هيكل المشروع

```
src/
├── app/
│   ├── (site)/          # الصفحات العامة (الرئيسية، أخبار، مقالات...)
│   ├── admin/           # لوحة إدارة الموقع
│   ├── writer/          # منصة الكتّاب (تسجيل دخول + كتابة)
│   └── api/             # API routes (cron, admin, writer, contact)
├── components/
│   ├── sections/        # NewsTicker, SocialBar, Navbar, Footer
│   └── ui/              # VideoCard, ArticleCard, NewsCard, WriterArticleCard...
├── lib/
│   ├── supabase.ts      # عملاء Supabase (public + admin + browser auth)
│   ├── supabase-server.ts # عميل Supabase للـ Server Components
│   ├── youtube.ts       # جلب فيديوهات YouTube
│   └── utils.ts         # تنسيق التواريخ، timeAgo، truncate
└── types/index.ts       # جميع الأنواع والثوابت
```
