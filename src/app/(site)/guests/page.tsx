import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const metadata = {
  title: "الضيوف | البلاغ",
  description: "الشخصيات التي استضافتها قناة البلاغ",
};

export const revalidate = 3600;

const CATEGORY_LABELS: Record<string, string> = {
  "وزير":    "وزراء",
  "برلماني": "برلمانيون",
  "ناشط":    "ناشطون",
  "مفكر":    "مفكرون",
  "صحفي":    "صحفيون",
  "أكاديمي": "أكاديميون",
  "آخر":     "آخرون",
};

async function getGuests() {
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .order("name");
  if (error) { console.error(error); return []; }
  return data ?? [];
}

export default async function GuestsPage() {
  const guests = await getGuests();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="الضيوف"
        subtitle="الشخصيات التي شاركت في حوارات قناة البلاغ"
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          className="px-4 py-1.5 rounded-full text-sm font-medium border"
          style={{ borderColor: "#C9A844", color: "#C9A844", background: "rgba(201,168,68,0.08)" }}
        >
          الكل
        </button>
        {Object.entries(CATEGORY_LABELS).map(([, label]) => (
          <button
            key={label}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={{ borderColor: "#2E2A18", color: "#9A9070" }}
          >
            {label}
          </button>
        ))}
      </div>

      {guests.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2" style={{ color: "#9A9070" }}>قريباً</p>
          <p className="text-sm" style={{ color: "#9A9070" }}>
            سيتم نشر قائمة ضيوف البلاغ قريباً
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {guests.map((guest: any) => (
            <div
              key={guest.id}
              className="group rounded-xl p-4 text-center card-hover"
              style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
            >
              <div className="relative mb-3">
                {guest.image_url ? (
                  <img
                    src={guest.image_url}
                    alt={guest.name}
                    className="w-20 h-20 rounded-full object-cover mx-auto transition-transform duration-300 group-hover:scale-105"
                    style={{ border: "2px solid #2E2A18" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto"
                    style={{ background: "rgba(201,168,68,0.15)", color: "#C9A844" }}
                  >
                    {guest.name[0]}
                  </div>
                )}
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                  style={{ background: "rgba(201,168,68,0.9)", color: "#111008" }}
                >
                  {guest.category}
                </span>
              </div>
              <p className="text-sm font-bold mt-3 leading-snug" style={{ color: "#F0EAD6" }}>
                {guest.name}
              </p>
              {guest.title && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "#9A9070" }}>
                  {guest.title}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
