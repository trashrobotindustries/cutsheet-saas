/**
 * lib/shop.ts
 * Resolves the shop record for the currently authed Clerk user.
 * A shop is scoped to a Clerk Organization. If the user has no active org,
 * we fall back to a personal shop keyed on userId.
 */

import { auth } from "@clerk/nextjs/server";
import { db, shops } from "@/db";
import { eq } from "drizzle-orm";

export type ShopContext = {
  shopId: string;
  userId: string;
};

/**
 * Returns { shopId, userId } for the current request.
 * Creates the shop row on first access.
 * Throws if the user is not authenticated.
 */
export async function getShopContext(): Promise<ShopContext> {
  const { userId, orgId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  // Prefer org-scoped shop; fall back to user-scoped personal shop
  const shopId = orgId ?? `user_${userId}`;

  const existing = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(shops).values({
      id: shopId,
      name: "My Shop",
      ownerId: userId,
      plan: "pro",
      defaultMargin: 0.4,
      shopRate: 125,
    });
  }

  return { shopId, userId };
}
