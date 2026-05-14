import { NextRequest, NextResponse } from "next/server";
import { getShopContext } from "@/lib/shop";
import { db, shops, machines, riskWeights } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { shopId } = await getShopContext();

    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
    const machineRows = await db.select().from(machines).where(eq(machines.shopId, shopId));
    const [rw] = await db.select().from(riskWeights).where(eq(riskWeights.shopId, shopId)).limit(1);

    return NextResponse.json({
      shopName: shop.name,
      shopRate: shop.shopRate,
      defaultMargin: shop.defaultMargin,
      machines: machineRows,
      riskWeights: rw?.weights ?? {},
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { shopId } = await getShopContext();
    const body = await req.json();

    const { shopName, shopRate, defaultMargin, machineList, riskWeightMap } = body;

    // Update shop
    await db.update(shops).set({
      name: shopName ?? undefined,
      shopRate: shopRate ?? undefined,
      defaultMargin: defaultMargin ?? undefined,
      updatedAt: new Date(),
    }).where(eq(shops.id, shopId));

    // Replace machines (delete + reinsert for simplicity — small dataset)
    if (Array.isArray(machineList)) {
      await db.delete(machines).where(eq(machines.shopId, shopId));
      if (machineList.length > 0) {
        await db.insert(machines).values(
          machineList.map((m: { id: string; name: string; rate: number }, i: number) => ({
            id: m.id,
            shopId,
            name: m.name,
            rate: m.rate,
            sortOrder: i,
          }))
        );
      }
    }

    // Upsert risk weights
    if (riskWeightMap !== undefined) {
      const existing = await db.select().from(riskWeights).where(eq(riskWeights.shopId, shopId)).limit(1);
      if (existing.length > 0) {
        await db.update(riskWeights).set({ weights: riskWeightMap }).where(eq(riskWeights.shopId, shopId));
      } else {
        await db.insert(riskWeights).values({ shopId, weights: riskWeightMap });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
