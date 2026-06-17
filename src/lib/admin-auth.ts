import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const authed = cookieStore.get("admin_authed")?.value === "1";

  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
