import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

async function getWriters() {
  const { data, error } = await supabaseAdmin
    .from("writers")
    .select("*")
    .order("name");
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export default async function AdminWritersPage() {
  const writers = await getWriters();

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

      {writers.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm mb-4" style={{ color: "#9A9070" }}>لا يوجد كتّاب بعد</p>
          <Link
            href="/admin/writers/new"
            className="px-5 py-2 rounded-full text-sm font-bold"
            style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
          >
            أضف أول كاتب
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {writers.map((writer: any) => (
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
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
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
                {writer.bio && (
                  <p className="text-xs line-clamp-2" style={{ color: "#9A9070" }}>{writer.bio}</p>
                )}
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
      )}
    </div>
  );
}
