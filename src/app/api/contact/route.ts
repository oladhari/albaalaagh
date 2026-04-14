import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, subject, message, type } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "حقول مطلوبة مفقودة" }, { status: 400 });
    }

    const typeLabel = type === "guest" ? "طلب ضيافة" : "استفسار عام";

    const htmlBody = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111008; color: #F0EAD6; padding: 24px; border-radius: 12px;">
        <h2 style="color: #C9A844; margin-bottom: 4px;">رسالة جديدة من موقع البلاغ</h2>
        <p style="color: #9A9070; font-size: 14px; margin-top: 0;">نوع الطلب: <strong style="color: #C9A844;">${typeLabel}</strong></p>
        <hr style="border-color: #2E2A18; margin: 16px 0;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #9A9070; width: 130px;">الاسم الكامل:</td>
            <td style="padding: 8px 0; color: #F0EAD6;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9A9070;">البريد الإلكتروني:</td>
            <td style="padding: 8px 0; color: #F0EAD6;"><a href="mailto:${email}" style="color: #C9A844;">${email}</a></td>
          </tr>
          ${role ? `
          <tr>
            <td style="padding: 8px 0; color: #9A9070;">الصفة / المنصب:</td>
            <td style="padding: 8px 0; color: #F0EAD6;">${role}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 8px 0; color: #9A9070;">الموضوع:</td>
            <td style="padding: 8px 0; color: #F0EAD6;">${subject}</td>
          </tr>
        </table>
        <hr style="border-color: #2E2A18; margin: 16px 0;" />
        <p style="color: #9A9070; font-size: 13px; margin-bottom: 8px;">الرسالة:</p>
        <div style="background: #1A1810; border: 1px solid #2E2A18; border-radius: 8px; padding: 16px; color: #F0EAD6; font-size: 14px; line-height: 1.8; white-space: pre-wrap;">${message}</div>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: "موقع البلاغ <onboarding@resend.dev>",
      to: ["contact@albaalaagh.com"],
      replyTo: email,
      subject: `[البلاغ] ${typeLabel}: ${subject}`,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "فشل إرسال الرسالة" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
