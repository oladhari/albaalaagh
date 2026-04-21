import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getStaff() {
  const { data, error } = await supabaseAdmin
    .from("guests")
    .select("*")
    .eq("is_staff", true)
    .order("name");
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export default async function AdminStaffPage() {
  const staff = await getStaff();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#F0EAD6" }}>الطاقم</h1>
          <p className="text-sm mt-1" style={{ color: "#9A9070" }}>
            أعضاء فريق البلاغ — يظهرون في صفحة "من نحن" ولا يظهرون في قائمة الضيوف
          </p>
        </div>
        <Link
          href="/admin/guests"
          className="text-xs px-4 py-2 rounded-full border"
          style={{ borderColor: "#2E2A18", color: "#9A9070" }}
        >
          ← إدارة الضيوف
        </Link>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm mb-2" style={{ color: "#9A9070" }}>لا يوجد أعضاء طاقم بعد</p>
          <p className="text-xs" style={{ color: "#9A9070" }}>
            في صفحة الضيوف، فعّل خيار "طاقم البلاغ" لأي ضيف لإضافته هنا
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {staff.map((member: any) => {
            const programs: string[] = member.program_names?.filter(Boolean) ?? [];
            return (
              <div
                key={member.id}
                className="flex gap-4 p-4 rounded-xl"
                style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
              >
                {member.image_url ? (
                  <img
                    src={member.image_url} alt={member.name}
                    className="w-14 h-14 rounded-full object-cover shrink-0"
                    style={{ border: "2px solid #2E2A18" }}
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                    style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
                  >
                    {member.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm mb-0.5" style={{ color: "#F0EAD6" }}>{member.name}</p>
                  <p className="text-xs mb-1" style={{ color: "#C9A844" }}>{member.title}</p>
                  {member.bio && (
                    <p className="text-xs line-clamp-2 mb-1" style={{ color: "#9A9070" }}>{member.bio}</p>
                  )}
                  {programs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {programs.map((p: string) => (
                        <span key={p} className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 self-start">
                  <Link
                    href={`/admin/guests/${member.id}/edit`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border block"
                    style={{ borderColor: "#2E2A18", color: "#9A9070" }}
                  >
                    تعديل
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
