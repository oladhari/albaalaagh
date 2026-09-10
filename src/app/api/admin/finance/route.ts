import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const [servicesRes, entriesRes] = await Promise.all([
    supabaseAdmin
      .from("expense_services")
      .select("id, name, currency, billing_type, display_order, created_at")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("expense_entries")
      .select("id, service_id, amount, entry_date, note, created_at")
      .order("entry_date", { ascending: false }),
  ]);

  if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });
  if (entriesRes.error) return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });

  return NextResponse.json({ services: servicesRes.data, entries: entriesRes.data });
}
