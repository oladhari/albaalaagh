import SectionHeader from "@/components/ui/SectionHeader";

export const metadata = {
  title: "المقابلات | البلاغ",
  description: "جميع مقابلات وحوارات قناة البلاغ السياسية",
};

export default async function InterviewsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="المقابلات والحوارات"
        subtitle="أرشيف كامل لحواراتنا مع شخصيات سياسية وفكرية بارزة"
      />
      <div
        className="rounded-2xl p-10 text-center mt-8"
        style={{ background: "#1A1810", border: "1px solid #2E2A18" }}
      >
        <p className="text-lg font-bold mb-2" style={{ color: "#F0EAD6" }}>
          قناة البلاغ على يوتيوب معلّقة مؤقتاً
        </p>
        <p className="text-sm" style={{ color: "#9A9070" }}>
          نعمل على استعادة القناة. تابعونا على فيسبوك، X، Twitch وKick في الأثناء.
        </p>
      </div>
    </div>
  );
}
