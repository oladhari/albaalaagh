"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [patching, setPatching] = useState<string | null>(null);
  const [showStaff, setShowStaff] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/guests", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/settings?key=show_staff", { credentials: "include" }).then((r) => r.json()),
    ]).then(([guests, setting]) => {
      setStaff((guests ?? []).filter((g: any) => g.is_staff).sort((a: any, b: any) => a.name.localeCompare(b.name, "ar")));
      setShowStaff(setting.value === "true");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleVisibility = async () => {
    const next = !showStaff;
    setTogglingVisibility(true);
    setShowStaff(next);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ key: "show_staff", value: next }),
    });
    setTogglingVisibility(false);
  };

  const toggleActive = async (id: string, val: boolean) => {
    setPatching(id);
    setStaff((prev) => prev.map((m) => m.id === id ? { ...m, is_active: val } : m));
    const res = await fetch("/api/admin/guests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, is_active: val }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStaff((prev) => prev.map((m) => m.id === id ? { ...m, is_active: !val } : m));
      alert(data.error || "فشل الحفظ");
    } else if (data.is_active !== val) {
      // Column missing in DB — value didn't save
      setStaff((prev) => prev.map((m) => m.id === id ? { ...m, is_active: !val } : m));
      alert("العمود is_active غير موجود في قاعدة البيانات. يرجى تشغيل SQL الآتي في Supabase:\nALTER TABLE guests ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;");
    }
    setPatching(null);
  };

  if (loading) return <div className="text-center py-20" style={{ color: "#9A9070" }}>جارٍ التحميل...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      {/* Visibility toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl mb-8" style={{ background: "#1A1810", border: `1px solid ${showStaff ? "rgba(201,168,68,0.3)" : "#2E2A18"}` }}>
        <div>
          <p className="text-sm font-bold" style={{ color: "#F0EAD6" }}>ظهور قسم "فريق البلاغ" في صفحة من نحن</p>
          <p className="text-xs mt-1" style={{ color: "#9A9070" }}>
            {showStaff ? "القسم ظاهر حالياً للزوار" : "القسم مخفي حالياً عن الزوار"}
          </p>
        </div>
        <button
          onClick={toggleVisibility}
          disabled={togglingVisibility}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all"
          style={{
            background: showStaff ? "rgba(201,168,68,0.15)" : "rgba(100,100,100,0.1)",
            border: `1px solid ${showStaff ? "rgba(201,168,68,0.4)" : "#2E2A18"}`,
            color: showStaff ? "#C9A844" : "#9A9070",
          }}
        >
          <span style={{ width: 32, height: 18, borderRadius: 9, background: showStaff ? "#C9A844" : "#2E2A18", position: "relative", display: "inline-block", transition: "background 0.2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.2s", left: showStaff ? 17 : 3 }} />
          </span>
          {showStaff ? "ظاهر" : "مخفي"}
        </button>
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
            const inactive = member.is_active === false;
            return (
              <div
                key={member.id}
                className="flex gap-4 p-5 rounded-xl"
                style={{
                  background: "#1A1810",
                  border: `1px solid ${inactive ? "#2E2A18" : "#2E2A18"}`,
                  opacity: inactive ? 0.7 : 1,
                }}
              >
                {/* Avatar */}
                {member.image_url ? (
                  <img
                    src={member.image_url} alt={member.name}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                    style={{ border: "2px solid #2E2A18", filter: inactive ? "grayscale(1)" : "none" }}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{ color: "#F0EAD6" }}>{member.name}</p>
                    {inactive && (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(100,100,100,0.2)", color: "#9A9070", border: "1px solid #2E2A18" }}>
                        سابقاً
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "#C9A844" }}>{member.title}</p>

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
                <div className="shrink-0 self-start flex flex-col gap-2 items-end">
                  {/* Active toggle */}
                  <label
                    className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                    style={{ color: inactive ? "#FF6B6B" : "#6BCB77" }}
                  >
                    <input
                      type="checkbox"
                      checked={!inactive}
                      disabled={patching === member.id}
                      onChange={(e) => toggleActive(member.id, e.target.checked)}
                    />
                    {inactive ? "غير نشط" : "نشط"}
                  </label>

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
