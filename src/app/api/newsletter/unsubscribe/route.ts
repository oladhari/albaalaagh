import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse("رابط غير صالح", { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token);

  if (error) {
    return new NextResponse("حدث خطأ", { status: 500 });
  }

  return new NextResponse(
    `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>إلغاء الاشتراك</title>
<style>body{font-family:Cairo,sans-serif;background:#0D0B06;color:#9A9070;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.box{text-align:center;padding:40px;}.title{color:#C9A844;font-size:24px;margin-bottom:12px;}
a{color:#C9A844;}</style></head>
<body><div class="box">
<div class="title">تم إلغاء اشتراكك</div>
<p>لن تصلك نشرات البلاغ البريدية بعد الآن.</p>
<p><a href="https://albaalaagh.com">العودة إلى الموقع</a></p>
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
