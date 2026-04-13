import Link from "next/link";
import type { Writer } from "@/types";

// TODO: fetch from Supabase
const mockWriters: Writer[] = Array.from({ length: 5 }, (_, i) => ({
  id: String(i + 1),
  name: ["د. محمد العربي", "الشيخ عبدالله التونسي", "أ. سامي الوسلاتي", "د. فاطمة الزهراء", "أ. نور الدين المرزوقي"][i],
  title: ["أستاذ العلوم السياسية", "عالم وفقيه", "خبير اقتصادي", "باحثة في الفكر الإسلامي", "محامٍ وناشط حقوقي"][i],
  bio: "كاتب ومفكر تونسي متخصص في الشأن السياسي والفكري.",
  image_url: `https://i.pravatar.cc/100?img=${i + 20}`,
  created_at: new Date().toISOString(),
}));

export default function AdminWritersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>الكتّاب</h1>
        <Link
          href="/admin/writers/new"
          className="px-5 py-2 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + إضافة كاتب
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mockWriters.map((writer) => (
          <div
            key={writer.id}
            className="flex gap-4 p-4 rounded-xl"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            {writer.image_url ? (
              <img
                src={writer.image_url}
                alt={writer.name}
                className="w-14 h-14 rounded-full object-cover shrink-0"
                style={{ border: "2px solid #2E2A18" }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
              >
                {writer.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm" style={{ color: "#F0EAD6" }}>{writer.name}</p>
              <p className="text-xs mb-2" style={{ color: "#C9A844" }}>{writer.title}</p>
              <p className="text-xs line-clamp-2" style={{ color: "#9A9070" }}>{writer.bio}</p>
            </div>
            <Link
              href={`/admin/writers/${writer.id}/edit`}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border self-start"
              style={{ borderColor: "#2E2A18", color: "#9A9070" }}
            >
              تعديل
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
