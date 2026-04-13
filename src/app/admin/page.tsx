import Link from "next/link";

const STATS = [
  { label: "أخبار بانتظار الموافقة", value: "7",  href: "/admin/news",     color: "#C9A844" },
  { label: "مقالات منشورة",          value: "24", href: "/admin/articles", color: "#6BCB77" },
  { label: "كتّاب مسجّلون",          value: "9",  href: "/admin/writers",  color: "#4D96FF" },
  { label: "فيديوهات على يوتيوب",     value: "∞",  href: "/interviews",    color: "#FF6B6B" },
];

const QUICK_ACTIONS = [
  { label: "إضافة مقال جديد", href: "/admin/articles/new", primary: true },
  { label: "إضافة كاتب جديد", href: "/admin/writers/new",  primary: false },
  { label: "مراجعة الأخبار",  href: "/admin/news",         primary: false },
];

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-black mb-8" style={{ color: "#F0EAD6" }}>لوحة التحكم</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {STATS.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="p-5 rounded-xl card-hover"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <p className="text-3xl font-black mb-1" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-xs" style={{ color: "#9A9070" }}>{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div
        className="p-6 rounded-xl mb-8"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        <h2 className="text-sm font-bold mb-4" style={{ color: "#C9A844" }}>إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all"
              style={
                action.primary
                  ? { background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }
                  : { border: "1px solid #2E2A18", color: "#9A9070" }
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div
        className="p-6 rounded-xl"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        <h2 className="text-sm font-bold mb-4" style={{ color: "#C9A844" }}>دليل الاستخدام</h2>
        <ul className="space-y-3 text-sm" style={{ color: "#9A9070", lineHeight: "1.8" }}>
          <li>
            <span style={{ color: "#E8D5A3" }}>الأخبار:</span>{" "}
            يجلب النظام الأخبار تلقائياً كل 6 ساعات من المصادر المختارة. توجه إلى قائمة الأخبار للموافقة على ما يناسبكم أو رفضه.
          </li>
          <li>
            <span style={{ color: "#E8D5A3" }}>المقالات:</span>{" "}
            أضف مقالات الكتّاب من خلال صفحة إضافة مقال جديد. يمكنك كتابة المحتوى مباشرة وإرفاق صورة غلاف وتصنيف المقال.
          </li>
          <li>
            <span style={{ color: "#E8D5A3" }}>الكتّاب:</span>{" "}
            أنشئ ملفاً لكل كاتب يشمل اسمه وصورته ونبذة عنه. سيظهر ملفه مرتبطاً بجميع مقالاته.
          </li>
        </ul>
      </div>
    </div>
  );
}
