import Link from "next/link";

const NAV = [
  { href: "/admin",          label: "لوحة التحكم"   },
  { href: "/admin/news",     label: "قائمة الأخبار" },
  { href: "/admin/articles", label: "المقالات"       },
  { href: "/admin/writers",  label: "الكتّاب"        },
  { href: "/admin/guests",   label: "الضيوف"         },
  { href: "/admin/staff",    label: "الطاقم"         },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="min-h-screen flex" style={{ background: "#0D0C06", fontFamily: "Cairo, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="w-56 shrink-0 flex flex-col py-6 px-4"
        style={{ background: "#111008", borderLeft: "1px solid #2E2A18" }}
      >
        <Link href="/" className="block mb-8">
          <span
            className="text-2xl font-black"
            style={{
              background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            البلاغ
          </span>
          <span className="block text-xs" style={{ color: "#9A9070" }}>لوحة الإدارة</span>
        </Link>

        <nav className="space-y-1 flex-1">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "#9A9070" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/"
          className="text-xs mt-4 px-3 py-2 rounded-lg"
          style={{ color: "#9A9070", background: "#1A1810" }}
        >
          ← العودة للموقع
        </Link>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
