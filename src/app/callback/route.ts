import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/tiktok";

// TikTok OAuth callback — redirect URI registered as https://albaalaagh.com/callback
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const msg = searchParams.get("error_description") ?? error ?? "Authorization denied";
    return NextResponse.redirect(
      new URL(`/admin/tiktok?error=${encodeURIComponent(msg)}`, "https://www.albaalaagh.com")
    );
  }

  try {
    await exchangeCode(code);
    return NextResponse.redirect(new URL("/admin/tiktok?connected=1", "https://www.albaalaagh.com"));
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/admin/tiktok?error=${encodeURIComponent(err.message)}`, "https://www.albaalaagh.com")
    );
  }
}
