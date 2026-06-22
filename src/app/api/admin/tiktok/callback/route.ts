import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/tiktok";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const msg = searchParams.get("error_description") ?? error ?? "Authorization denied";
    return NextResponse.redirect(new URL(`/admin/tiktok?error=${encodeURIComponent(msg)}`, req.url));
  }

  try {
    await exchangeCode(code);
    return NextResponse.redirect(new URL("/admin/tiktok?connected=1", req.url));
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/admin/tiktok?error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
