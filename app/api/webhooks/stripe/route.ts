import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db, shops } from "@/db";
import { eq } from "drizzle-orm";
import type { PlanId } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as { customer: string; id: string; status: string; items: { data: { price: { id: string } }[] } };
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id;

      const { PLANS } = await import("@/lib/stripe");
      let plan: PlanId = "free";
      if (priceId === PLANS.pro.priceId) plan = "pro";
      if (priceId === PLANS.enterprise.priceId) plan = "enterprise";

      await db
        .update(shops)
        .set({ plan, stripeSubscriptionId: sub.id, updatedAt: new Date() })
        .where(eq(shops.stripeCustomerId, customerId));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as { customer: string };
      await db
        .update(shops)
        .set({ plan: "free", stripeSubscriptionId: null, updatedAt: new Date() })
        .where(eq(shops.stripeCustomerId, sub.customer));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
