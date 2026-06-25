import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://albaalaagh.com";

export async function POST(req: NextRequest) {
  const { subject, intro, videos, articles, news } = await req.json();

  // Collect all recipients: paid subscribers + free newsletter subscribers
  const [{ data: paidSubs }, { data: freeSubs }] = await Promise.all([
    supabaseAdmin.from("subscribers").select("email, name").eq("status", "active"),
    supabaseAdmin.from("newsletter_subscribers").select("email, name, unsubscribe_token").eq("status", "active"),
  ]);

  type Recipient = { email: string; name: string | null; unsubscribe_token?: string };
  const allRecipients: Recipient[] = [
    ...(paidSubs ?? []).map(s => ({ email: s.email, name: s.name ?? null })),
    ...(freeSubs ?? []).map(s => ({ email: s.email, name: s.name ?? null, unsubscribe_token: s.unsubscribe_token })),
  ];

  // Deduplicate by email
  const seen = new Set<string>();
  const recipients = allRecipients.filter(r => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  if (!recipients.length) {
    return NextResponse.json({ error: "لا يوجد مشتركون نشطون" }, { status: 400 });
  }

  let sent = 0;
  const errors: string[] = [];

  // Send in batches of 10 to respect Resend rate limits
  for (let i = 0; i < recipients.length; i += 10) {
    const batch = recipients.slice(i, i + 10);
    await Promise.all(batch.map(async (sub) => {
      try {
        const html = buildEmailHtml({ subject, intro, videos, articles, news, unsubscribeToken: sub.unsubscribe_token });
        await resend.emails.send({
          from:    "البلاغ <newsletter@albaalaagh.com>",
          to:      sub.email,
          subject,
          html,
        });
        sent++;
      } catch (e: any) {
        errors.push(`${sub.email}: ${e.message}`);
      }
    }));
    if (i + 10 < recipients.length) await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({ sent, errors });
}

function buildEmailHtml({ subject, intro, videos, articles, news, unsubscribeToken }: {
  subject: string;
  intro: string;
  videos: { id: string; title: string; video_url: string }[];
  articles: { id: string; title: string; slug: string; excerpt: string | null }[];
  news: { id: string; title: string; url: string; source: string }[];
  unsubscribeToken?: string;
}) {
  const unsubscribeUrl = unsubscribeToken
    ? `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`
    : null;
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0D0B06;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0B06;">
  <tr><td align="center" style="padding:32px 16px;">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1A1810,#111008);border:1px solid #2E2A18;border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
        <h1 style="color:#C9A844;font-size:32px;margin:0 0 8px;">البلاغ</h1>
        <p style="color:#9A9070;margin:0;font-size:14px;">النشرة الأسبوعية</p>
      </td></tr>

      <tr><td style="height:16px;"></td></tr>

      <!-- Subject & intro -->
      <tr><td style="background:#1A1810;border:1px solid #2E2A18;border-radius:16px;padding:24px;">
        <h2 style="color:#E8D5A3;font-size:20px;margin:0 0 12px;">${subject}</h2>
        ${intro ? `<p style="color:#9A9070;line-height:1.8;margin:0;">${intro}</p>` : ""}
      </td></tr>

      <tr><td style="height:16px;"></td></tr>

      ${videos.length ? `
      <!-- Videos -->
      <tr><td style="background:#1A1810;border:1px solid #2E2A18;border-radius:16px;padding:24px;">
        <h3 style="color:#C9A844;font-size:16px;margin:0 0 16px;">📺 حلقات هذا الأسبوع</h3>
        ${videos.map(v => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr>
            <td>
              <a href="${SITE_URL}/videos/${v.id}" style="color:#E8D5A3;text-decoration:none;font-size:14px;font-weight:bold;">${v.title}</a>
              <br><a href="${SITE_URL}/videos/${v.id}" style="color:#C9A844;font-size:12px;text-decoration:none;">مشاهدة الحلقة ←</a>
            </td>
          </tr>
        </table>`).join("")}
      </td></tr>
      <tr><td style="height:16px;"></td></tr>
      ` : ""}

      ${articles.length ? `
      <!-- Articles -->
      <tr><td style="background:#1A1810;border:1px solid #2E2A18;border-radius:16px;padding:24px;">
        <h3 style="color:#C9A844;font-size:16px;margin:0 0 16px;">✍️ أحدث المقالات</h3>
        ${articles.map(a => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr><td>
            <a href="${SITE_URL}/articles/${a.slug}" style="color:#E8D5A3;text-decoration:none;font-size:14px;font-weight:bold;">${a.title}</a>
            ${a.excerpt ? `<br><span style="color:#9A9070;font-size:12px;">${a.excerpt}</span>` : ""}
            <br><a href="${SITE_URL}/articles/${a.slug}" style="color:#C9A844;font-size:12px;text-decoration:none;">اقرأ المقال ←</a>
          </td></tr>
        </table>`).join("")}
      </td></tr>
      <tr><td style="height:16px;"></td></tr>
      ` : ""}

      ${news.length ? `
      <!-- News -->
      <tr><td style="background:#1A1810;border:1px solid #2E2A18;border-radius:16px;padding:24px;">
        <h3 style="color:#C9A844;font-size:16px;margin:0 0 16px;">📰 أبرز أخبار الأسبوع</h3>
        ${news.map(n => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
          <tr><td>
            <a href="${n.url}" style="color:#9A9070;text-decoration:none;font-size:13px;">• ${n.title}</a>
            <span style="color:#6B6040;font-size:11px;"> — ${n.source}</span>
          </td></tr>
        </table>`).join("")}
      </td></tr>
      <tr><td style="height:16px;"></td></tr>
      ` : ""}

      <!-- Footer -->
      <tr><td style="text-align:center;padding:16px;">
        <p style="color:#6B6040;font-size:11px;margin:0;">
          البلاغ · <a href="${SITE_URL}" style="color:#6B6040;">${SITE_URL}</a><br>
          أنت مشترك في النشرة البريدية لقناة البلاغ.
          ${unsubscribeUrl ? `<br><a href="${unsubscribeUrl}" style="color:#6B6040;">إلغاء الاشتراك</a>` : ""}
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
