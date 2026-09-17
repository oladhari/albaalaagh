import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (stripeClient) return stripeClient;

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured");

  stripeClient = new Stripe(apiKey, {
    apiVersion: "2026-05-27.dahlia",
    httpClient: Stripe.createNodeHttpClient(),
  });

  return stripeClient;
}

export const PLANS = {
  basic:   { nameAr: "داعم",  nameEn: "Basic",   eur: 5,  usd: 6  },
  pro:     { nameAr: "شريك", nameEn: "Pro",     eur: 10, usd: 11 },
  partner: { nameAr: "راعٍ", nameEn: "Partner", eur: 20, usd: 22 },
} as const;

export type PlanKey = keyof typeof PLANS;
export type Currency = "eur" | "usd";
