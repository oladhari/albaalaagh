import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";

const FEATURED_ORDER = [
  "منبر الأحد",
  "سياسة في العمق",
  "الشريعة و السياسة",
  "على الطاولة",
  "اليوم التالي",
  "حصاد الأسبوع",
  "هات الحل",
  "حدث و خبر مع رمزي",
  "الشأن المغربي",
  "فلسطين قضية العالم بأسره",
  "حصاد 25",
];

interface Playlist {
  id: string;
  name: string;
  thumbnail: string | null;
  count: number;
}

interface Props {
  playlists: Playlist[];
}

export default function PlaylistsSection({ playlists }: Props) {
  if (playlists.length === 0) return null;

  const byName = new Map(playlists.map(p => [p.name, p]));
  const featured = FEATURED_ORDER.map(name => byName.get(name)).filter(Boolean) as Playlist[];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title="البرامج والحلقات"
        subtitle="اختر برنامجاً لمشاهدة حلقاته"
        linkHref="/interviews"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {featured.map((pl) => (
          <Link
            key={pl.id}
            href={`/interviews?playlist=${pl.id}`}
            className="group block rounded-2xl overflow-hidden card-hover"
            style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
          >
            {/* Thumbnail */}
            <div className="relative overflow-hidden" style={{ aspectRatio: "16/9" }}>
              {pl.thumbnail ? (
                <img
                  src={pl.thumbnail}
                  alt={pl.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "#111008" }}>
                  <svg viewBox="0 0 24 24" className="w-10 h-10 opacity-20" fill="#C9A844">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              )}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(17,16,8,0.75) 0%, transparent 60%)" }}
              />
              {/* Episode count badge */}
              <span
                className="absolute bottom-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(17,16,8,0.85)", color: "#C9A844", border: "1px solid rgba(201,168,68,0.3)" }}
              >
                {pl.count} حلقة
              </span>
            </div>

            {/* Name */}
            <div className="px-3 py-2.5">
              <h3
                className="text-sm font-black leading-snug line-clamp-2 transition-colors group-hover:text-[#C9A844]"
                style={{ color: "#F0EAD6" }}
              >
                {pl.name}
              </h3>
            </div>
          </Link>
        ))}

        {/* "All videos" card */}
        <Link
          href="/interviews"
          className="group block rounded-2xl overflow-hidden card-hover"
          style={{ background: "#1A1810", border: "1px solid rgba(201,168,68,0.2)" }}
        >
          <div className="relative overflow-hidden flex items-center justify-center" style={{ aspectRatio: "16/9", background: "rgba(201,168,68,0.05)" }}>
            <svg viewBox="0 0 24 24" className="w-10 h-10 transition-transform duration-200 group-hover:scale-110" fill="#C9A844" opacity="0.5">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
          </div>
          <div className="px-3 py-2.5">
            <h3 className="text-sm font-black" style={{ color: "#C9A844" }}>عرض الكل</h3>
          </div>
        </Link>
      </div>
    </section>
  );
}
