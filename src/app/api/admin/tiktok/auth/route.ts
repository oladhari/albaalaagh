import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildAuthUrl } from "@/lib/tiktok";

export async function GET() {
  const unauthed = await requireAdmin();
  if (unauthed) return unauthed;

  const state   = Math.random().toString(36).slice(2);
  const authUrl = buildAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
