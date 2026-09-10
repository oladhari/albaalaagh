import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { name, currency, billing_type, display_order, monthly_amount, start_date } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "اسم الخدمة مطلوب" }, { status: 400 });
  if (!["USD", "JPY", "TND"].includes(currency)) return NextResponse.json({ error: "عملة غير صالحة" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("expense_services")
    .insert({
      name: name.trim(),
      currency,
      billing_type: billing_type === "subscription" ? "subscription" : "usage",
      display_order: display_order ?? 0,
      monthly_amount: monthly_amount !== undefined && monthly_amount !== "" ? Number(monthly_amount) : null,
      start_date: start_date || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
