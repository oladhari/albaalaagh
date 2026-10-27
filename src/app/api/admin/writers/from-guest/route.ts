import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

const PROFILE_FIELDS = "id,name,title,bio,image_url";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const { data, error } = await supabaseAdmin.from("guests")
    .select(PROFILE_FIELDS).order("name");
  if (error) return NextResponse.json({ error: "تعذّر تحميل الضيوف" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;
  const body = await req.json().catch(() => null);
  if (typeof body?.guest_id !== "string" ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.guest_id)) {
    return NextResponse.json({ error: "اختر ضيفاً صالحاً" }, { status: 400 });
  }
  const { data: guest, error: guestError } = await supabaseAdmin.from("guests")
    .select(PROFILE_FIELDS).eq("id", body.guest_id).maybeSingle();
  if (guestError) return NextResponse.json({ error: "تعذّر تحميل الضيف" }, { status: 500 });
  if (!guest) return NextResponse.json({ error: "الضيف غير موجود" }, { status: 404 });
  if (!guest.name?.trim() || !guest.title?.trim()) {
    return NextResponse.json({ error: "أكمل اسم الضيف وصفته أولاً" }, { status: 400 });
  }
  // A person already listed as a writer must not get another profile. Do not
  // overwrite a writer's independently edited biography or login information.
  const namePattern = guest.name.trim().replace(/[\\%_]/g, "\\$&");
  const { data: matches, error: lookupError } = await supabaseAdmin.from("writers")
    .select(PROFILE_FIELDS).ilike("name", namePattern);
  if (lookupError) return NextResponse.json({ error: "تعذّر التحقق من الكاتب" }, { status: 500 });
  if ((matches?.length ?? 0) > 1) {
    return NextResponse.json({ error: "يوجد أكثر من كاتب بهذا الاسم؛ راجع السجلات أولاً" }, { status: 409 });
  }
  if (matches?.length) return NextResponse.json({ writer: matches[0], existing: true });

  // Reuse the guest UUID as the new writer UUID: the tables remain separate,
  // while the writers primary key makes concurrent imports of this guest safe.
  const profile = { id: guest.id, name: guest.name.trim(), title: guest.title.trim(),
    bio: guest.bio || "", image_url: guest.image_url || null };
  const { data: writer, error } = await supabaseAdmin.from("writers")
    .insert(profile).select(PROFILE_FIELDS).single();
  if (error?.code === "23505") {
    const { data: concurrent, error: concurrentError } = await supabaseAdmin.from("writers")
      .select(PROFILE_FIELDS).eq("id", guest.id).maybeSingle();
    if (!concurrentError && concurrent?.name === profile.name) {
      return NextResponse.json({ writer: concurrent, existing: true });
    }
  }
  if (error) return NextResponse.json({ error: "تعذّرت إضافة الكاتب" }, { status: 500 });
  return NextResponse.json({ writer, existing: false }, { status: 201 });
}
