import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";
import type Stripe from "stripe";

const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = "force-dynamic";

async function sendThankYou({ email, name, amount, currency, type }: {
  email: string; name: string | null; amount: number; currency: string; type: string;
}) {
  const displayName = name ? name.split(" ")[0] : "صديق البلاغ";
  const amountStr   = (amount / 100).toFixed(2);
  const currencyStr = currency.toUpperCase() === "EUR" ? "€" : "$";
  const isSubscription = type === "subscription";

  const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #111008; color: #F0EAD6; padding: 32px; border-radius: 16px;">
      <h1 style="color: #C9A844; font-size: 28px; margin-bottom: 4px; text-align: center;">البلاغ</h1>
      <p style="color: #6B6448; font-size: 13px; text-align: center; margin-top: 0; margin-bottom: 32px;">منبر إعلامي تونسي مستقل</p>

      <hr style="border-color: #2E2A18; margin-bottom: 28px;" />

      <p style="font-size: 18px; color: #F0EAD6;">السلام عليكم <strong style="color: #C9A844;">${displayName}</strong>،</p>

      <p style="font-size: 15px; line-height: 1.9; color: #D0C8A8;">
        من أعماق قلوبنا، نشكرك على دعمك لقناة البلاغ.
        ${isSubscription
          ? `اشتراكك الشهري بمبلغ <strong style="color:#C9A844;">${currencyStr}${amountStr}</strong> يُمكّننا من مواصلة رسالتنا الإعلامية المستقلة.`
          : `تبرعك بمبلغ <strong style="color:#C9A844;">${currencyStr}${amountStr}</strong> يُمثّل لنا دعماً معنوياً ومادياً لا يُقدَّر بثمن.`
        }
      </p>

      <p style="font-size: 15px; line-height: 1.9; color: #D0C8A8;">
        البلاغ منبر مستقل يؤمن بحرية الكلمة، ووجودنا مرهون بدعم أصدقاء مثلك.
        كل مساهمة — مهما كانت — تُساعدنا على إنتاج المزيد من الحوارات المعمّقة ومتابعة الشأن التونسي والعربي.
      </p>

      <div style="background: #1A1810; border: 1px solid #2E2A18; border-radius: 12px; padding: 20px; margin: 28px 0; text-align: center;">
        <p style="color: #9A9070; font-size: 13px; margin: 0 0 8px 0;">مساهمتك</p>
        <p style="color: #C9A844; font-size: 28px; font-weight: bold; margin: 0;">${currencyStr}${amountStr}</p>
        <p style="color: #6B6448; font-size: 12px; margin: 8px 0 0 0;">${isSubscription ? "اشتراك شهري" : "تبرع لمرة واحدة"}</p>
      </div>

      <p style="font-size: 15px; line-height: 1.9; color: #D0C8A8;">
        نسأل الله أن يبارك لك في مالك وأهلك، وأن يجعل هذا الدعم في ميزان حسناتك.
      </p>

      <p style="font-size: 15px; color: #D0C8A8;">مع خالص التقدير والامتنان،</p>
      <p style="font-size: 15px; color: #C9A844; font-weight: bold;">فريق البلاغ</p>

      <hr style="border-color: #2E2A18; margin: 28px 0;" />

      <p style="font-size: 12px; color: #4A4530; text-align: center;">
        <a href="https://www.albaalaagh.com" style="color: #6B6448;">albaalaagh.com</a>
      </p>
    </div>
  `;

  await resend.emails.send({
    from: "البلاغ <noreply@albaalaagh.com>",
    to: [email],
    subject: "شكراً على دعمك للبلاغ 🙏",
    html,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const email   = session.customer_details?.email ?? "";
      const name    = session.customer_details?.name  ?? null;
      const plan    = (session.metadata?.plan ?? "one_time") as string;
      const type    = session.metadata?.type ?? "one_time";
      const currency = session.currency ?? "eur";
      const amount   = session.amount_total ?? 0;

      await supabaseAdmin.from("subscribers").upsert({
        email,
        name,
        stripe_customer_id:     session.customer as string ?? null,
        stripe_subscription_id: session.subscription as string ?? null,
        plan,
        amount,
        currency,
        status: "active",
      }, { onConflict: "stripe_customer_id" });

      if (email) await sendThankYou({ email, name, amount, currency, type });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabaseAdmin
        .from("subscribers")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      if (invoice.subscription) {
        await supabaseAdmin
          .from("subscribers")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", invoice.subscription);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status === "active" ? "active"
        : sub.status === "canceled"         ? "cancelled"
        : "past_due";
      await supabaseAdmin
        .from("subscribers")
        .update({ status })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
