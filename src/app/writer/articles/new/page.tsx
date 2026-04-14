import { createServerSupabase } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import WriterArticleEditor from "../WriterArticleEditor";

export default async function NewWriterArticlePage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  if (!writer) {
    return (
      <div className="text-center py-20">
        <p style={{ color: "#9A9070" }}>لم يتم ربط حسابك بملف كاتب. تواصل مع الإدارة.</p>
      </div>
    );
  }

  return <WriterArticleEditor writerId={writer.id} />;
}
