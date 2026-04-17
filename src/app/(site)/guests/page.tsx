import SectionHeader from "@/components/ui/SectionHeader";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import GuestsGrid from "./GuestsGrid";

export const metadata = {
  title: "الضيوف | البلاغ",
  description: "الشخصيات التي استضافتها قناة البلاغ",
};

export const revalidate = 3600;

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

      {guests.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2" style={{ color: "#9A9070" }}>قريباً</p>
          <p className="text-sm" style={{ color: "#9A9070" }}>
            سيتم نشر قائمة ضيوف البلاغ قريباً
          </p>
        </div>
      ) : (
        <GuestsGrid guests={guests} />
      )}
    </div>
  );
}
