import { NextRequest, NextResponse } from "next/server";
import { getShopContext } from "@/lib/shop";
import { db, suppliers } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const { shopId } = await getShopContext();
    const rows = await db.select().from(suppliers).where(eq(suppliers.shopId, shopId));
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { shopId } = await getShopContext();
    const body = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = `supp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const [inserted] = await db.insert(suppliers).values({
      id,
      shopId,
      name: body.name.trim(),
      contact: body.contact ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      materialsSupplied: body.materialsSupplied ?? null,
      notes: body.notes ?? null,
    }).returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
