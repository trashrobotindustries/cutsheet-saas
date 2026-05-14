import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const PLANS = {
  free: {
    name: "Free",
    priceId: null,
    jobLimit: 10,
    userLimit: 1,
    features: ["10 jobs total", "1 user", "Local export/import"],
  },
  pro: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    jobLimit: Infinity,
    userLimit: 5,
    features: [
      "Unlimited jobs",
      "Up to 5 users",
      "Cloud sync",
      "Customer & vendor CRM",
      "Full history",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    jobLimit: Infinity,
    userLimit: Infinity,
    features: [
      "Everything in Pro",
      "Unlimited users",
      "Priority support",
      "Custom onboarding",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
