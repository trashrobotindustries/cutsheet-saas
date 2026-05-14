import { NextRequest, NextResponse } from "next/server";
import { getShopContext } from "@/lib/shop";
import { db, jobs } from "@/db";
import { eq, and } from "drizzle-orm";

type RouteCtx = { params: Promise<{ id: string }> };

async function getJob(shopId: string, id: string) {
  const [row] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), eq(jobs.shopId, shopId)))
    .limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { shopId } = await getShopContext();
    const { id } = await ctx.params;
    const job = await getJob(shopId, id);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(job);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  try {
    const { shopId } = await getShopContext();
    const { id } = await ctx.params;
    const existing = await getJob(shopId, id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    const [updated] = await db.update(jobs).set({
      partNumber: body.partNumber ?? existing.partNumber,
      partName: body.partName ?? existing.partName,
      revision: body.revision ?? existing.revision,
      customerId: body.customerId ?? existing.customerId,
      status: body.status ?? existing.status,
      paymentTerms: body.paymentTerms ?? existing.paymentTerms,
      margin: body.margin ?? existing.margin,
      quantities: body.quantities ?? existing.quantities,
      lineItems: body.lineItems ?? existing.lineItems,
      results: body.results ?? existing.results,
      riskFlags: body.riskFlags ?? existing.riskFlags,
      notes: body.notes ?? existing.notes,
      internalNotes: body.internalNotes ?? existing.internalNotes,
      updatedAt: new Date(),
    }).where(and(eq(jobs.id, id), eq(jobs.shopId, shopId))).returning();

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
    const existing = await getJob(shopId, id);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.shopId, shopId)));
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
