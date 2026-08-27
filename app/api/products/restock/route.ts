import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST - Restock a product
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { productId, quantity, outletId, note, costPrice } = body;

        if (!productId || !quantity || quantity <= 0) {
            return NextResponse.json({ error: "productId dan quantity (>0) wajib diisi" }, { status: 400 });
        }

        const resolvedOutletId = outletId || (await prisma.outlet.findFirst({ where: { isActive: true }, select: { id: true } }))?.id;
        if (!resolvedOutletId) {
            return NextResponse.json({ error: "Outlet tidak ditemukan" }, { status: 400 });
        }

        const outletProduct = await prisma.outletProduct.findUnique({
            where: { outletId_productId: { outletId: resolvedOutletId, productId } },
        });

        if (!outletProduct) {
            // Create new outlet-product link
            const newOutletProduct = await prisma.outletProduct.create({
                data: { outletId: resolvedOutletId, productId, currentStock: quantity, minStock: 5, isAvailable: true },
            });
            return NextResponse.json({ success: true, outletProduct: newOutletProduct, message: `Stok ditambahkan: +${quantity}` });
        }

        const previousStock = outletProduct.currentStock;
        const currentStock = previousStock + quantity;

        await prisma.$transaction(async (tx) => {
            // Update costPrice if provided (supplier price may change)
            if (costPrice !== undefined && Number(costPrice) >= 0) {
                await tx.product.update({
                    where: { id: productId },
                    data: { costPrice: Number(costPrice) },
                });
            }

            await tx.outletProduct.update({
                where: { id: outletProduct.id },
                data: { currentStock, isAvailable: true },
            });

            await tx.inventory.create({
                data: {
                    outletId: resolvedOutletId,
                    productId,
                    type: "RESTOCK",
                    quantity,
                    previousStock,
                    currentStock,
                    note: note || `Restock +${quantity}`,
                    createdBy: (await tx.user.findFirst({ where: { role: "ADMIN", isActive: true }, select: { id: true } }))?.id || "system",
                },
            });
        });

        return NextResponse.json({ success: true, previousStock, currentStock, message: `Stok berhasil ditambahkan: ${previousStock} → ${currentStock}` });
    } catch (error) {
        console.error("Restock error:", error);
        return NextResponse.json({ error: "Gagal restock" }, { status: 500 });
    }
}