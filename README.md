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
- **OpenAI Responses API** — إنشاء المسودات العربية وتصنيف الأخبار عبر مزوّد قابل للتبديل
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

انسخ ملف المثال محلياً واملأ القيم المطلوبة:

```bash
cp .env.example .env.local
```

لا تضع أي قيمة حقيقية من `.env.local` في README أو التوثيق أو السكريبتات
المحفوظة في Git. تُدار أسرار الإنتاج حصراً في مدير أسرار منصة الاستضافة.

### 3. قاعدة البيانات (Supabase)

تُدار تغييرات قاعدة البيانات حصراً كمهاجرات مرتبة ومراجَعة داخل
`supabase/migrations/`. لا تُضف تعليمات SQL مؤقتة إلى README، ولا تنفّذ تغييرات
يدوية مباشرة على قاعدة بيانات الإنتاج.

كل تغيير جديد يجب أن يتضمن مهاجرة مستقلة قابلة للمراجعة، وسياسات RLS اللازمة،
وخطة تحقق أو تراجع مناسبة. إجراءات الإنتاج، ربط الحسابات، وعمليات الاستعادة تبقى
في دليل التشغيل الداخلي الخاص بالفريق ولا تُحفظ في المستودع العام.

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

يُصنّف مزوّد الذكاء الاصطناعي المهيأ كل خبر حسب `geo` و`category`، وتبقى
الأخبار بحالة انتظار إلى أن يراجعها محرر وينشرها يدوياً.

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
supabase/
└── migrations/                    # المصدر المعتمد لتغييرات قاعدة البيانات
facebook-events-backup.json        # نسخة احتياطية من 700 حدث فيسبوك (محلي)
```
