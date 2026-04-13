import SectionHeader from "@/components/ui/SectionHeader";
import type { Guest } from "@/types";

export const metadata = {
  title: "الضيوف | البلاغ",
  description: "الشخصيات التي استضافتها قناة البلاغ",
};

// TODO: Replace with Supabase query
const mockGuests: Guest[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  name: [
    "د. رضا بلحاج", "أ. سمير ديلو", "د. عبد اللطيف المكي",
    "الأستاذ نورالدين البحيري", "د. منية الجبري", "أ. زياد العذاري",
    "د. فاطمة المسدي", "الشيخ راشد الغنوشي", "أ. عياض اللومي",
    "د. سهام بن سدرين", "أ. محمد القوماني", "د. إبراهيم الكسيبي",
  ][i],
  title: [
    "وزير سابق", "برلماني سابق", "وزير الصحة الأسبق",
    "وزير العدل الأسبق", "ناشطة حقوقية", "وزير سابق",
    "أكاديمية وكاتبة", "قيادي سياسي", "ناشط سياسي",
    "رئيسة هيئة حقوقية", "مفكر إسلامي", "خبير اقتصادي",
  ][i],
  category: (["وزير", "برلماني", "وزير", "وزير", "ناشط", "وزير", "أكاديمي", "آخر", "ناشط", "ناشط", "مفكر", "أكاديمي"] as Guest["category"][])[i],
  image_url: `https://i.pravatar.cc/200?img=${i + 10}`,
  created_at: new Date().toISOString(),
}));

const CATEGORY_LABELS: Record<string, string> = {
  "وزير": "وزراء",
  "برلماني": "برلمانيون",
  "ناشط": "ناشطون",
  "مفكر": "مفكرون",
  "صحفي": "صحفيون",
  "أكاديمي": "أكاديميون",
  "آخر": "آخرون",
};

export default function GuestsPage() {
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

      {/* Guests grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {mockGuests.map((guest) => (
          <div
            key={guest.id}
            className="group rounded-xl p-4 text-center card-hover cursor-pointer"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            <div className="relative mb-3">
              {guest.image_url ? (
                <img
                  src={guest.image_url}
                  alt={guest.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto transition-transform duration-300 group-hover:scale-105"
                  style={{ border: "2px solid #2E2A18" }}
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
            <p className="text-xs mt-1 line-clamp-2" style={{ color: "#9A9070" }}>
              {guest.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
