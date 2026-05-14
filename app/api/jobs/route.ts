import { NextRequest, NextResponse } from "next/server";
import { getShopContext } from "@/lib/shop";
import { db, jobs } from "@/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { shopId } = await getShopContext();
    const rows = await db
      .select()
      .from(jobs)
      .where(eq(jobs.shopId, shopId))
      .orderBy(desc(jobs.createdAt));
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { shopId, userId } = await getShopContext();
    const body = await req.json();

    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const jobNumber = body.jobNumber ?? id;

    const [inserted] = await db.insert(jobs).values({
      id,
      shopId,
      jobNumber,
      partNumber: body.partNumber ?? null,
      partName: body.partName ?? null,
      revision: body.revision ?? null,
      customerId: body.customerId ?? null,
      status: body.status ?? "draft",
      paymentTerms: body.paymentTerms ?? null,
      margin: body.margin ?? 0.35,
      quantities: body.quantities ?? [1],
      lineItems: body.lineItems ?? {},
      results: body.results ?? {},
      riskFlags: body.riskFlags ?? {},
      notes: body.notes ?? null,
      internalNotes: body.internalNotes ?? null,
      createdBy: userId,
    }).returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
