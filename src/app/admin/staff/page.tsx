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
        <div className="space-y-4">
          {staff.map((member: any) => {
            const programs: string[] = member.program_names?.filter(Boolean) ?? [];
            const roles: string[]   = member.roles?.filter(Boolean) ?? [];
            return (
              <div
                key={member.id}
                className="flex gap-4 p-5 rounded-xl"
                style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
              >
                {/* Avatar */}
                {member.image_url ? (
                  <img
                    src={member.image_url} alt={member.name}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                    style={{ border: "2px solid #2E2A18" }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
                    style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
                  >
                    {member.name[0]}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#F0EAD6" }}>{member.name}</p>
                    <p className="text-xs" style={{ color: "#C9A844" }}>{member.title}</p>
                  </div>

                  {/* Roles */}
                  {roles.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <span
                          key={r}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(107,203,119,0.15)", color: "#6BCB77", border: "1px solid rgba(107,203,119,0.3)" }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Programs */}
                  {programs.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {programs.map((p) => (
                        <span
                          key={p}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(201,168,68,0.1)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.2)" }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {member.bio && (
                    <p className="text-xs line-clamp-2" style={{ color: "#9A9070" }}>{member.bio}</p>
                  )}
                </div>

                {/* Actions */}
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
