import { supabaseAdmin } from "@/lib/supabase";
import TikTokManualList from "@/components/admin/TikTokManualList";

async function getRecentShorts() {
  const { data } = await supabaseAdmin
    .from("site_videos")
    .select("id, title, description, video_url, published_at")
    .eq("video_type", "short")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(500);
  return data ?? [];
}

async function getTikTokStatus() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("key, value")
    .in("key", ["tiktok_access_token", "tiktok_open_id", "tiktok_token_expires_at"]);

  const map: Record<string, string> = {};
  (data ?? []).forEach((r: any) => { map[r.key] = r.value; });

  const connected  = !!map["tiktok_access_token"];
  const openId     = map["tiktok_open_id"] ?? null;
  const expiresAt  = map["tiktok_token_expires_at"]
    ? new Date(parseInt(map["tiktok_token_expires_at"], 10)).toLocaleString("ar-TN")
    : null;

  return { connected, openId, expiresAt };
}

export default async function TikTokAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp     = await searchParams;
  const [status, shorts] = await Promise.all([getTikTokStatus(), getRecentShorts()]);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-black mb-8" style={{ color: "#F0EAD6" }}>TikTok</h1>

      {sp.connected && (
        <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: "rgba(107,203,119,0.1)", border: "1px solid rgba(107,203,119,0.3)", color: "#6BCB77" }}>
          ✓ تم ربط حساب TikTok بنجاح
        </div>
      )}
      {sp.error && (
        <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", color: "#FF6B6B" }}>
          خطأ: {sp.error}
        </div>
      )}

      <div className="p-5 rounded-xl space-y-4" style={{ background: "#1A1810", border: "1px solid #2E2A18" }}>
        <div className="flex items-center gap-3">
          {/* TikTok icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#111008" }}>
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.73a4.85 4.85 0 01-1-.04z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "#F0EAD6" }}>TikTok Content Posting</p>
            {status.connected ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77" }}>
                ✓ مرتبط
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(255,107,107,0.12)", color: "#FF6B6B" }}>
                غير مرتبط
              </span>
            )}
          </div>
        </div>

        {status.connected && (
          <div className="text-xs space-y-1" style={{ color: "#9A9070" }}>
            {status.openId   && <p>Open ID: <span style={{ color: "#F0EAD6" }}>{status.openId}</span></p>}
            {status.expiresAt && <p>Token ينتهي: <span style={{ color: "#F0EAD6" }}>{status.expiresAt}</span></p>}
          </div>
        )}

        <a
          href="/api/admin/tiktok/auth"
          className="inline-block px-5 py-2.5 rounded-full text-sm font-bold"
          style={{ background: status.connected ? "#1A1810" : "#000", color: "#fff", border: status.connected ? "1px solid #2E2A18" : "none" }}
        >
          {status.connected ? "إعادة الربط" : "ربط حساب TikTok"}
        </a>

        {!status.connected && (
          <p className="text-xs" style={{ color: "#9A9070" }}>
            سيتم تحويلك إلى TikTok لتسجيل الدخول ومنح الصلاحيات. يُستخدم هذا لنشر الفيديوهات تلقائياً.
          </p>
        )}
      </div>

      {!status.connected && (
        <div className="mt-8">
          <h2 className="text-xs font-bold mb-1" style={{ color: "#C9A844" }}>نشر يدوي — بانتظار ربط الحساب</h2>
          <p className="text-xs mb-3" style={{ color: "#9A9070" }}>
            انسخ العنوان (وهو نفسه ما سيُستخدم كنص الفيديو لاحقاً)، حمّل الفيديو، وارفعه من تطبيق TikTok يدوياً.
          </p>
          <TikTokManualList videos={shorts} />
        </div>
      )}
    </div>
  );
}
