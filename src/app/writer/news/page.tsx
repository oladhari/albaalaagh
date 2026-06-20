import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { formatArabicDate } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pending:  "بانتظار المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};
const STATUS_COLOR: Record<string, string> = {
  pending:  "#C9A844",
  approved: "#6BCB77",
  rejected: "#FF6B6B",
};

export default async function EditorNewsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/writer/login");

  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!writer || writer.role !== "editor") redirect("/writer");

  const { data: items } = await supabaseAdmin
    .from("news")
    .select("id, title, status, category, created_at")
    .eq("submitted_by", writer.id)
    .order("created_at", { ascending: false });

  const all = items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black mb-1" style={{ color: "#F0EAD6" }}>أخباري</h1>
          <p className="text-sm" style={{ color: "#9A9070" }}>الأخبار التي أرسلتها للمراجعة</p>
        </div>
        <Link
          href="/writer/news/new"
          className="px-5 py-2.5 rounded-full text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #C9A844, #9A7B28)", color: "#111008" }}
        >
          + خبر جديد
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="text-center py-20 rounded-xl" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
          <p className="text-lg mb-2" style={{ color: "#9A9070" }}>لم تُرسل أي أخبار بعد</p>
          <Link href="/writer/news/new" className="text-sm" style={{ color: "#C9A844" }}>
            ابدأ بإرسال خبر جديد ←
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {all.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: "#F0EAD6" }}>
                  {item.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#9A9070" }}>
                  {item.category} · {formatArabicDate(item.created_at)}
                </p>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
                style={{
                  color:      STATUS_COLOR[item.status] ?? "#9A9070",
                  background: `${STATUS_COLOR[item.status] ?? "#9A9070"}18`,
                }}
              >
                {STATUS_LABEL[item.status] ?? item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
