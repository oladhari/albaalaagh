import { NextRequest, NextResponse } from "next/server";
import { PLANS, type PlanKey, type Currency } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripePost(path: string, params: Record<string, string>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2026-05-27.dahlia",
    },
    body: new URLSearchParams(params).toString(),
    cache: "no-store",
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  const { type, plan, currency, amount } = await req.json() as {
    type: "subscription" | "one_time";
    plan?: PlanKey;
    currency: Currency;
    amount?: number;
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://albaalaagh.com";

  try {
    if (type === "subscription" && plan) {
      const p = PLANS[plan];
      const unitAmount = String(currency === "eur" ? p.eur * 100 : p.usd * 100);

      const session = await stripePost("/checkout/sessions", {
        mode: "subscription",
        "line_items[0][price_data][currency]": currency,
        "line_items[0][price_data][product_data][name]": `دعم البلاغ — ${p.nameAr}`,
        "line_items[0][price_data][product_data][description]": "اشتراك شهري لدعم قناة البلاغ المستقلة",
        "line_items[0][price_data][recurring][interval]": "month",
        "line_items[0][price_data][unit_amount]": unitAmount,
        "line_items[0][quantity]": "1",
        "success_url": `${siteUrl}/support/success?session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url":  `${siteUrl}/support`,
        "metadata[plan]": plan,
        "metadata[type]": "subscription",
        "statement_descriptor_suffix": "ALBAALAAGH",
      });

      if (session.error) throw new Error(session.error.message);
      return NextResponse.json({ url: session.url });
    }

    if (type === "one_time" && amount) {
      const session = await stripePost("/checkout/sessions", {
        mode: "payment",
        "line_items[0][price_data][currency]": currency,
        "line_items[0][price_data][product_data][name]": "دعم البلاغ — تبرع",
        "line_items[0][price_data][product_data][description]": "دعم قناة البلاغ الإعلامية المستقلة",
        "line_items[0][price_data][unit_amount]": String(Math.round(amount * 100)),
        "line_items[0][quantity]": "1",
        "success_url": `${siteUrl}/support/success?session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url":  `${siteUrl}/support`,
        "metadata[type]": "one_time",
        "payment_intent_data[statement_descriptor_suffix]": "ALBAALAAGH",
      });

      if (session.error) throw new Error(session.error.message);
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
