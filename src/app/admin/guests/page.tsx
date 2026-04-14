import { fetchAllVideoTitles } from "@/lib/youtube";
import { supabaseAdmin } from "@/lib/supabase";
import GuestsManager from "./GuestsManager";

export const revalidate = 3600;

export default async function AdminGuestsPage() {
  const [videos, { data: guests }] = await Promise.all([
    fetchAllVideoTitles(50),
    supabaseAdmin.from("guests").select("*").order("name"),
  ]);

  return <GuestsManager videos={videos} initialGuests={guests ?? []} />;
}
