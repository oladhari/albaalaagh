import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import LogoutButton from "./LogoutButton";

export default async function WriterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/writer/login");

  // Get the writer's profile
  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("id, name")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen flex" style={{ background: "#0D0C06", fontFamily: "Cairo, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col py-6 px-4 bg-bg border-l border-border">
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
          <span className="block text-xs text-text-muted">منصة الكتّاب</span>
        </Link>

        {writer && (
          <div className="mb-6 p-3 rounded-xl bg-bg-card border border-border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black mb-2 bg-gold/[0.15] text-gold">
              {writer.name[0]}
            </div>
            <p className="text-sm font-bold text-text">{writer.name}</p>
            <p className="text-xs text-text-muted">كاتب</p>
          </div>
        )}

        <nav className="space-y-1 flex-1">
          <Link href="/writer" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted">
            لوحة التحكم
          </Link>
          <Link href="/writer/articles" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted">
            مقالاتي
          </Link>
          <Link href="/writer/articles/new" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gold">
            + كتابة مقال
          </Link>
        </nav>

        <div className="space-y-2 mt-4">
          <Link href="/" className="block text-xs px-3 py-2 rounded-lg text-text-muted bg-bg-card">
            ← الموقع الرئيسي
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8 text-text">
        {children}
      </main>
    </div>
  );
}
