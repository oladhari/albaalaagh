import { supabaseAdmin as supabase } from "@/lib/supabase";
import { staffScore } from "@/lib/staff-roles";

export const metadata = {
  title: "من نحن | البلاغ",
  description: "تعرف على قناة البلاغ ورسالتها ومنهجها",
};

export const revalidate = 3600;

async function getStaff() {
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, title, image_url, roles")
    .eq("is_staff", true)
    .order("name");
  if (error) { console.error(error); return []; }

  const staff = data ?? [];
  if (staff.length === 0) return [];

  const ids = staff.map((s: any) => s.id);
  const { data: programs } = await supabase
    .from("guests")
    .select("host_id")
    .eq("tier", "program")
    .in("host_id", ids);

  const counts: Record<string, number> = {};
  for (const p of programs ?? []) {
    if (p.host_id) counts[p.host_id] = (counts[p.host_id] ?? 0) + 1;
  }

  return staff.map((s: any) => ({ ...s, programs_count: counts[s.id] ?? 0 }));
}

export default async function AboutPage() {
  const staff = await getStaff();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      {/* Header */}
      <div className="text-center mb-14">
        <h1
          className="text-5xl font-black mb-4"
          style={{
            background: "linear-gradient(135deg, #E8D5A3, #C9A844, #9A7B28)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            paddingBottom: "0.15em",
            lineHeight: "1.2",
          }}
        >
          البلاغ
        </h1>
        <p className="text-lg" style={{ color: "#9A9070" }}>
          منبر سياسي تونسي مستقل
        </p>
        <hr className="gold-separator mt-6" />
      </div>

      {/* Content blocks */}
      <div className="space-y-10 text-base leading-loose" style={{ color: "#D4C9A8", lineHeight: "2.2" }}>

        <div
          className="p-6 rounded-2xl"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <h2 className="text-xl font-black mb-4" style={{ color: "#C9A844" }}>من نحن</h2>
          <p>
            قناة البلاغ منبر إعلامي تونسي مستقل يتخصص في إنتاج المحتوى السياسي والفكري الراقي. نُجري حوارات معمقة مع شخصيات بارزة من وزراء وبرلمانيين وناشطين ومفكرين وأكاديميين، ساعين إلى تقديم صورة شاملة وموضوعية عن المشهد التونسي والعربي.
          </p>
        </div>

        <div
          className="p-6 rounded-2xl"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <h2 className="text-xl font-black mb-4" style={{ color: "#C9A844" }}>رسالتنا</h2>
          <p>
            نؤمن بأن الكلمة الحرة أمانة، وأن الإعلام الجاد مسؤولية. رسالتنا تقديم محتوى يحترم عقل المتلقي، ويرفض الإثارة الرخيصة والتضليل. نسعى إلى أن يكون البلاغ مرجعاً موثوقاً للمواطن التونسي والعربي الباحث عن الحقيقة.
          </p>
        </div>

        <div
          className="p-6 rounded-2xl"
          style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
        >
          <h2 className="text-xl font-black mb-4" style={{ color: "#C9A844" }}>منهجنا</h2>
          <ul className="space-y-3">
            {[
              "نفتح أبوابنا لجميع التوجهات الفكرية والسياسية شريطة احترام قواعد الحوار",
              "نحترم المنهج الإسلامي الوسطي مرجعيةً للقيم لا للتعصب",
              "نرفض الانقلاب على الإرادة الشعبية ونقف ضد كل استبداد",
              "نُميّز بين المعلومة والرأي ونلتزم بالدقة والأمانة في النقل",
              "نؤمن بأن الاختلاف رحمة وأن التنوع ثروة",
            ].map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full" style={{ background: "#C9A844" }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Staff — pyramid layout */}
      {staff.length > 0 && (() => {
        // Sort by weighted score descending, then group into pyramid rows: 1, 2, 3, 4…
        const sorted = [...staff].sort((a: any, b: any) =>
          staffScore(b.roles ?? []) - staffScore(a.roles ?? [])
        );
        const tiers: any[][] = [];
        let i = 0, rowSize = 1;
        while (i < sorted.length) {
          tiers.push(sorted.slice(i, i + rowSize));
          i += rowSize;
          rowSize++;
        }

        const colsClass = (n: number) => {
          if (n === 1) return "flex justify-center";
          if (n === 2) return "grid grid-cols-2 max-w-md mx-auto gap-5";
          if (n === 3) return "grid grid-cols-3 gap-5";
          return "grid grid-cols-2 sm:grid-cols-4 gap-5";
        };

        return (
          <div className="mt-14">
            <div className="flex items-center gap-4 mb-10">
              <h2 className="text-xl font-black" style={{ color: "#C9A844" }}>فريق البلاغ</h2>
              <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #2E2A18)" }} />
            </div>

            <div className="space-y-6">
              {tiers.map((tier, ti) => {
                const isTop = ti === 0;
                const imgSize = isTop ? "w-24 h-24" : "w-16 h-16";
                const nameSize = isTop ? "text-base" : "text-sm";
                const cardPad = isTop ? "p-6" : "p-4";
                const maxW = isTop ? "max-w-xs w-full" : "";

                return (
                  <div key={ti} className={colsClass(tier.length)}>
                    {tier.map((member: any) => {
                      const roles: string[] = member.roles?.filter(Boolean) ?? [];
                      return (
                        <div
                          key={member.id}
                          className={`rounded-2xl text-center ${cardPad} ${maxW}`}
                          style={{
                            background: "#1A1810",
                            border: `1px solid ${isTop ? "#C9A844" : "#2E2A18"}`,
                            boxShadow: isTop ? "0 0 30px rgba(201,168,68,0.08)" : "none",
                          }}
                        >
                          {/* Avatar */}
                          <div className="flex justify-center mb-3">
                            {member.image_url ? (
                              <img
                                src={member.image_url}
                                alt={member.name}
                                className={`${imgSize} rounded-full object-cover`}
                                style={{ border: `2px solid ${isTop ? "#C9A844" : "#2E2A18"}` }}
                              />
                            ) : (
                              <div
                                className={`${imgSize} rounded-full flex items-center justify-center font-black`}
                                style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844", fontSize: isTop ? 32 : 22 }}
                              >
                                {member.name[0]}
                              </div>
                            )}
                          </div>

                          {/* Name & title */}
                          <p className={`font-black ${nameSize} leading-snug`} style={{ color: "#F0EAD6" }}>
                            {member.name}
                          </p>
                          {member.title && (
                            <p className="text-xs mt-1" style={{ color: "#9A9070" }}>{member.title}</p>
                          )}

                          {/* Roles */}
                          {roles.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 mt-3">
                              {roles.map((r) => (
                                <span
                                  key={r}
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(107,203,119,0.12)", color: "#6BCB77", border: "1px solid rgba(107,203,119,0.25)" }}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Programs count */}
                          {member.programs_count > 0 && (
                            <p className="text-xs mt-2 font-semibold" style={{ color: "#C9A844" }}>
                              {member.programs_count} {member.programs_count === 1 ? "برنامج" : "برامج"}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
        {[
          { number: "500+", label: "مقابلة" },
          { number: "9", label: "منصات" },
          { number: "100K+", label: "متابع" },
          { number: "5+", label: "سنوات خبرة" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="text-center p-5 rounded-xl"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <p
              className="text-3xl font-black mb-1"
              style={{
                background: "linear-gradient(135deg, #E8D5A3, #C9A844)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {stat.number}
            </p>
            <p className="text-sm" style={{ color: "#9A9070" }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
