import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

// POST — create a new Supabase auth account and link it to the writer
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { id } = await params;
  const { email, password, role } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
  }
  if (!["writer", "editor"].includes(role)) {
    return NextResponse.json({ error: "الدور غير صالح" }, { status: 400 });
  }

  // Verify the writer exists and isn't already linked
  const { data: writer, error: writerErr } = await supabaseAdmin
    .from("writers")
    .select("id, name, user_id")
    .eq("id", id)
    .single();

  if (writerErr || !writer) {
    return NextResponse.json({ error: "الكاتب غير موجود" }, { status: 404 });
  }
  if (writer.user_id) {
    return NextResponse.json({ error: "هذا الكاتب مرتبط بحساب بالفعل" }, { status: 409 });
  }

  // Create the Supabase auth user
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? "فشل إنشاء الحساب" }, { status: 500 });
  }

  // Link the auth user to the writer record
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("writers")
    .update({ user_id: authData.user.id, role })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    // Roll back: delete the auth user we just created
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ writer: updated, email: authData.user.email }, { status: 201 });
}

// PATCH — change role of an already-linked writer
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const { id } = await params;
  const { role } = await req.json();

  if (!["writer", "editor"].includes(role)) {
    return NextResponse.json({ error: "الدور غير صالح" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("writers")
    .update({ role })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
