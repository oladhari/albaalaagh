"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/writer/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full text-xs px-3 py-2 rounded-lg text-right"
      style={{ color: "#FF6B6B", background: "rgba(255,107,107,0.08)" }}
    >
      تسجيل الخروج
    </button>
  );
}
