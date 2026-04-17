import { fetchAllVideoTitles } from "@/lib/youtube";
import { supabaseAdmin } from "@/lib/supabase";
import GuestsManager from "./GuestsManager";
import ReviewPanel from "./ReviewPanel";

export const revalidate = 3600;

export default async function AdminGuestsPage() {
  const [videos, { data: guests }] = await Promise.all([
    fetchAllVideoTitles(50),
    supabaseAdmin.from("guests").select("*").order("name"),
  ]);

  return (
    <>
      <GuestsManager videos={videos} initialGuests={guests ?? []} />
      <div className="max-w-3xl mt-8">
        <hr style={{ borderColor: "#2E2A18", marginBottom: "2rem" }} />
        <ReviewPanel />
      </div>
    </>
  );
}
