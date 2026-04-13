import { fetchLatestVideos } from "@/lib/youtube";
import VideoCard from "@/components/ui/VideoCard";
import SectionHeader from "@/components/ui/SectionHeader";

const CATEGORIES = ["الكل", "مقابلات سياسية", "حوارات فكرية", "شهادات", "تحليلات"];

export const metadata = {
  title: "المقابلات | البلاغ",
  description: "جميع مقابلات وحوارات قناة البلاغ السياسية",
};

export default async function InterviewsPage() {
  const videos = await fetchLatestVideos(18);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="المقابلات والحوارات"
        subtitle="أرشيف كامل لحواراتنا مع شخصيات سياسية وفكرية بارزة"
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200"
            style={{
              borderColor: cat === "الكل" ? "#C9A844" : "#2E2A18",
              color: cat === "الكل" ? "#C9A844" : "#9A9070",
              background: cat === "الكل" ? "rgba(201,168,68,0.08)" : "transparent",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(videos as { id: string; youtube_id: string; title: string; thumbnail_url: string; published_at: string }[]).map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>

      {/* Load more */}
      <div className="text-center mt-10">
        <a
          href="https://www.youtube.com/@albaalaagh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #C9A844, #9A7B28)",
            color: "#111008",
          }}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.6 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z"/>
          </svg>
          عرض المزيد على يوتيوب
        </a>
      </div>
    </div>
  );
}
