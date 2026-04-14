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
          <span className="block text-xs" style={{ color: "#9A9070" }}>منصة الكتّاب</span>
        </Link>

        {writer && (
          <div
            className="mb-6 p-3 rounded-xl"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black mb-2"
              style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
            >
              {writer.name[0]}
            </div>
            <p className="text-sm font-bold" style={{ color: "#F0EAD6" }}>{writer.name}</p>
            <p className="text-xs" style={{ color: "#9A9070" }}>كاتب</p>
          </div>
        )}

        <nav className="space-y-1 flex-1">
          <Link
            href="/writer"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium"
            style={{ color: "#9A9070" }}
          >
            لوحة التحكم
          </Link>
          <Link
            href="/writer/articles"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium"
            style={{ color: "#9A9070" }}
          >
            مقالاتي
          </Link>
          <Link
            href="/writer/articles/new"
            className="block px-3 py-2.5 rounded-lg text-sm font-medium"
            style={{ color: "#C9A844" }}
          >
            + كتابة مقال
          </Link>
        </nav>

        <div className="space-y-2 mt-4">
          <Link
            href="/"
            className="block text-xs px-3 py-2 rounded-lg"
            style={{ color: "#9A9070", background: "#1A1810" }}
          >
            ← الموقع الرئيسي
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8" style={{ color: "#F0EAD6" }}>
        {children}
      </main>
    </div>
  );
}
