import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { service_id, amount, entry_date, note } = await req.json();
  if (!service_id) return NextResponse.json({ error: "الخدمة مطلوبة" }, { status: 400 });
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return NextResponse.json({ error: "المبلغ مطلوب" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("expense_entries")
    .insert({
      service_id,
      amount: Number(amount),
      entry_date: entry_date || new Date().toISOString().slice(0, 10),
      note: note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
