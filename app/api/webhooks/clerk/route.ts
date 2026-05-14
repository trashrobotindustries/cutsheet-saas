import { NextRequest, NextResponse } from "next/server";
import { db, shops } from "@/db";
import { eq } from "drizzle-orm";

// Clerk sends org and user lifecycle events here.
// Wire this in Clerk dashboard → Webhooks.
export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { type, data } = payload;

  switch (type) {
    case "organization.created": {
      await db.insert(shops).values({
        id: data.id,
        name: data.name,
        ownerId: data.created_by,
        plan: "free",
      }).onConflictDoNothing();
      break;
    }

    case "organization.deleted": {
      await db.delete(shops).where(eq(shops.id, data.id));
      break;
    }

    case "organization.updated": {
      await db
        .update(shops)
        .set({ name: data.name, updatedAt: new Date() })
        .where(eq(shops.id, data.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
