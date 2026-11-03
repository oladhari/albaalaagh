import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import GuestsGrid from "./GuestsGrid";

export const metadata = {
  title: "الضيوف | البلاغ",
  description: "الشخصيات التي استضافتها قناة البلاغ",
  alternates: { canonical: "/guests" },
};

export const revalidate = 300;

async function getGuests() {
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, title, image_url, category, tier, writer:writers(name, title, image_url)")
    .eq("is_staff", false)
    .order("name");
  if (error) { console.error(error); return []; }
  return (data ?? []).map((g) => {
    const writer = Array.isArray(g.writer) ? g.writer[0] : g.writer;
    if (!writer) return g;
    return {
      ...g,
      image_url: writer.image_url || g.image_url,
      title:     writer.title     || g.title,
    };
  });
}

export default async function GuestsPage() {
  const all = await getGuests();
  const programs = all.filter((g) => g.tier === "program");
  const guests   = all.filter((g) => g.tier !== "program");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        as="h1"
        title="الضيوف"
        subtitle="الشخصيات التي شاركت في حوارات قناة البلاغ"
      />

      {all.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2 text-text-muted">قريباً</p>
          <p className="text-sm text-text-muted">
            سيتم نشر قائمة ضيوف البلاغ قريباً
          </p>
        </div>
      ) : (
        <GuestsGrid programs={programs} guests={guests} />
      )}
    </div>
  );
}
