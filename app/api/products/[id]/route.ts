import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT - Update product
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, category, costPrice, sellingPrice, isActive } = body;

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
        }

        const updated = await prisma.product.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(category !== undefined && { category }),
                ...(costPrice !== undefined && { costPrice: Number(costPrice) }),
                ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return NextResponse.json({ success: true, product: updated });
    } catch (error) {
        console.error("Update product error:", error);
        return NextResponse.json({ error: "Gagal mengupdate produk" }, { status: 500 });
    }
}

// DELETE - Soft delete product (set isActive = false)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
        }

        await prisma.product.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json({ success: true, message: "Produk dinonaktifkan" });
    } catch (error) {
        console.error("Delete product error:", error);
        return NextResponse.json({ error: "Gagal menghapus produk" }, { status: 500 });
    }
}