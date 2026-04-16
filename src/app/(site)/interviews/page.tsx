import { fetchLiveStreams, fetchAllPlaylists, fetchShorts } from "@/lib/youtube";
import SectionHeader from "@/components/ui/SectionHeader";
import InterviewsTabs from "./InterviewsTabs";

export const metadata = {
  title: "المقابلات | البلاغ",
  description: "جميع مقابلات وحوارات قناة البلاغ السياسية",
};

export const revalidate = 3600;

const ORDERED_PLAYLISTS = [
  "البلاغ الذكية",
  "سياسة في العمق",
  "منبر الأحد",
  "حصاد الأسبوع",
  "هات الحل",
  "حدث و خبر مع رمزي",
  "الشريعة و السياسة",
  "رسالة من الزنزانة",
  "فلسطين قضية العالم بأسره",
  "وعد الآخرة",
  "حصاد 25",
];

export default async function InterviewsPage() {
  const [liveStreams, allPlaylists, shorts] = await Promise.all([
    fetchLiveStreams(20),
    fetchAllPlaylists(),
    fetchShorts(12),
  ]);

  // Filter and reorder to exactly those 11 playlists
  const playlists = ORDERED_PLAYLISTS
    .map((name) =>
      allPlaylists.find(
        (p) => p.title.includes(name) || name.includes(p.title)
      )
    )
    .filter(Boolean) as typeof allPlaylists;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="المقابلات والحوارات"
        subtitle="أرشيف كامل لحواراتنا مع شخصيات سياسية وفكرية بارزة"
      />
      <InterviewsTabs
        liveStreams={liveStreams.slice(0, 9)}
        playlists={playlists}
        shorts={shorts}
      />
    </div>
  );
}
