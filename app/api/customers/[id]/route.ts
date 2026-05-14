import { NextRequest, NextResponse } from "next/server";
import { getShopContext } from "@/lib/shop";
import { db, customers } from "@/db";
import { eq, and } from "drizzle-orm";

type RouteCtx = { params: Promise<{ id: string }> };

async function getCustomer(shopId: string, id: string) {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.shopId, shopId)))
    .limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { shopId } = await getShopContext();
    const { id } = await ctx.params;
    const row = await getCustomer(shopId, id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  try {
    const { shopId } = await getShopContext();
    const { id } = await ctx.params;
    const existing = await getCustomer(shopId, id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const [updated] = await db.update(customers).set({
      name: body.name ?? existing.name,
      contact: body.contact ?? existing.contact,
      phone: body.phone ?? existing.phone,
      email: body.email ?? existing.email,
      address: body.address ?? existing.address,
      paymentTerms: body.paymentTerms ?? existing.paymentTerms,
      preferredCarrier: body.preferredCarrier ?? existing.preferredCarrier,
      notes: body.notes ?? existing.notes,
      updatedAt: new Date(),
    }).where(and(eq(customers.id, id), eq(customers.shopId, shopId))).returning();

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { shopId } = await getShopContext();
    const { id } = await ctx.params;
    const existing = await getCustomer(shopId, id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.shopId, shopId)));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
