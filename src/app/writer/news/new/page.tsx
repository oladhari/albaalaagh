import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import NewsSubmitForm from "../NewsSubmitForm";

export default async function NewNewsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/writer/login");

  const { data: writer } = await supabaseAdmin
    .from("writers")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!writer || writer.role !== "editor") redirect("/writer");

  return (
    <div>
      <h1 className="text-2xl font-black mb-1" style={{ color: "#F0EAD6" }}>
        إرسال خبر جديد
      </h1>
      <p className="text-sm mb-8" style={{ color: "#9A9070" }}>
        سيُراجع الخبر من قِبل المحرر الرئيسي قبل النشر
      </p>
      <NewsSubmitForm />
    </div>
  );
}
