import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

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
