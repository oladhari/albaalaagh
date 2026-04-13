import { formatArabicDate } from "@/lib/utils";
import Link from "next/link";

// TODO: Replace with Supabase fetch by slug
async function getArticle(slug: string) {
  return {
    id: "1",
    slug,
    title: "أزمة الدولة في تونس: المشروعية والسلطة",
    excerpt: "قراءة معمقة في جذور الأزمة السياسية التونسية وتداعياتها على مستقبل الديمقراطية في البلاد.",
    content: `
      <p>يعيش المشهد السياسي التونسي على وقع أزمة متشعبة الأبعاد، تتداخل فيها المعطيات الاقتصادية والاجتماعية مع إشكاليات الحوكمة والحريات. فمنذ انقلاب الخامس والعشرين من يوليو 2021، يجد المجتمع التونسي نفسه أمام خيارات مصيرية تتعلق بهويته ومساره الديمقراطي.</p>

      <h2>جذور الأزمة</h2>
      <p>لا يمكن فهم الأزمة التونسية بمعزل عن سياقها التاريخي والبنيوي. فالدولة التونسية ورثت نظاماً مركزياً متجذراً، يُصعّب تحوّله إلى نموذج ديمقراطي حقيقي دون إصلاحات هيكلية جوهرية. وقد كشفت تجربة الانتقال الديمقراطي (2011-2021) عن هشاشة المؤسسات وضعف الثقافة الديمقراطية لدى النخب.</p>

      <h2>إشكالية المشروعية</h2>
      <p>تظل مسألة المشروعية في صلب النقاش السياسي التونسي. فبينما يستند أصحاب السلطة إلى خطاب شعبوي يدّعي التمثيل الحقيقي للإرادة الشعبية، تتمسك المعارضة بمبدأ التعددية والتداول السلمي على السلطة بوصفهما ركيزتين أساسيتين للديمقراطية الحقيقية.</p>

      <blockquote>المشروعية ليست مجرد انتخاب، بل هي منظومة قيم وضمانات دستورية وآليات رقابية تحمي الحقوق وتصون الحريات.</blockquote>

      <h2>آفاق المستقبل</h2>
      <p>رغم قتامة المشهد الراهن، تبقى إمكانية التحول الديمقراطي قائمة. فتونس تمتلك مجتمعاً مدنياً نشطاً، وطبقة شبابية واعية، وإرثاً نضالياً عريقاً. غير أن ذلك يستلزم وحدة قوى التغيير وتجاوز الخلافات الثانوية في مواجهة الاستبداد.</p>
    `,
    cover_image: "https://picsum.photos/seed/article1/1200/600",
    category: "سياسة",
    published: true,
    published_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date().toISOString(),
    writer: {
      id: "w1",
      name: "د. محمد العربي",
      title: "أستاذ العلوم السياسية — جامعة تونس",
      bio: "أستاذ متخصص في العلوم السياسية والعلاقات الدولية، يكتب عن الديمقراطية والتحولات السياسية في العالم العربي.",
      image_url: undefined,
      created_at: "",
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: "#9A9070" }}>
        <Link href="/" className="hover:text-[#C9A844] transition-colors">الرئيسية</Link>
        <span>←</span>
        <Link href="/articles" className="hover:text-[#C9A844] transition-colors">المقالات</Link>
        <span>←</span>
        <span style={{ color: "#C9A844" }}>{article.title}</span>
      </nav>

      {/* Category */}
      <span
        className="inline-block text-xs px-3 py-1 rounded-full font-medium mb-4"
        style={{ background: "rgba(201,168,68,0.12)", color: "#C9A844" }}
      >
        {article.category}
      </span>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-black leading-snug mb-4" style={{ color: "#F0EAD6" }}>
        {article.title}
      </h1>

      {/* Excerpt */}
      <p className="text-lg mb-6" style={{ color: "#9A9070", lineHeight: "1.8" }}>
        {article.excerpt}
      </p>

      {/* Author + Meta */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl mb-8"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        {article.writer.image_url ? (
          <img
            src={article.writer.image_url}
            alt={article.writer.name}
            className="w-12 h-12 rounded-full object-cover"
            style={{ border: "2px solid #C9A844" }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
          >
            {article.writer.name[0]}
          </div>
        )}
        <div>
          <p className="font-bold text-sm" style={{ color: "#E8D5A3" }}>{article.writer.name}</p>
          <p className="text-xs" style={{ color: "#9A9070" }}>{article.writer.title}</p>
        </div>
        <div className="mr-auto text-xs" style={{ color: "#9A9070" }}>
          {formatArabicDate(article.published_at)}
        </div>
      </div>

      {/* Cover image */}
      {article.cover_image && (
        <div className="rounded-2xl overflow-hidden mb-8" style={{ aspectRatio: "16/7" }}>
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Divider */}
      <hr className="gold-separator mb-8" />

      {/* Article content */}
      <div
        className="article-prose"
        style={{ color: "#D4C9A8" }}
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Divider */}
      <hr className="gold-separator mt-12 mb-8" />

      {/* Author bio */}
      <div
        className="p-6 rounded-xl"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        <h3 className="text-sm font-bold mb-3" style={{ color: "#C9A844" }}>عن الكاتب</h3>
        <div className="flex gap-4 items-start">
          {article.writer.image_url ? (
            <img
              src={article.writer.image_url}
              alt={article.writer.name}
              className="w-16 h-16 rounded-full object-cover shrink-0"
              style={{ border: "2px solid #C9A844" }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
            >
              {article.writer.name[0]}
            </div>
          )}
          <div>
            <p className="font-bold" style={{ color: "#E8D5A3" }}>{article.writer.name}</p>
            <p className="text-sm mb-2" style={{ color: "#C9A844" }}>{article.writer.title}</p>
            <p className="text-sm leading-relaxed" style={{ color: "#9A9070" }}>{article.writer.bio}</p>
          </div>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: "#9A9070" }}
        >
          → العودة إلى المقالات
        </Link>
      </div>
    </div>
  );
}
