import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-05-27.dahlia",
  httpClient: Stripe.createNodeHttpClient(),
});

export const PLANS = {
  basic:   { nameAr: "داعم",  nameEn: "Basic",   eur: 5,  usd: 6  },
  pro:     { nameAr: "شريك", nameEn: "Pro",     eur: 10, usd: 11 },
  partner: { nameAr: "راعٍ", nameEn: "Partner", eur: 20, usd: 22 },
} as const;

export type PlanKey = keyof typeof PLANS;
export type Currency = "eur" | "usd";
