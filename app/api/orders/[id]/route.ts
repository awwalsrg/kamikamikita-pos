import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, context: any) {
    try {
        const params = await context.params;
        const id = params.id;

        // Gunakan transaksi Prisma untuk menghapus data turunan secara aman berurutan
        await prisma.$transaction(async (tx) => {
            // 1. Hapus item KDS (Kitchen Display System) jika ada
            await tx.kdsOrderItem.deleteMany({ where: { orderId: id } }).catch(() => { });

            // 2. Hapus log inventory jika ada yang terkait
            await tx.inventory.deleteMany({ where: { reference: id } }).catch(() => { });

            // 3. Hapus data pembayaran
            await tx.payment.deleteMany({ where: { orderId: id } }).catch(() => { });

            // 4. Hapus rincian item pesanan
            await tx.orderItem.deleteMany({ where: { orderId: id } }).catch(() => { });

            // 5. Hapus transaksi utamanya
            await tx.order.delete({ where: { id } });
        });

        return NextResponse.json({ success: true, message: "Order deleted successfully" });
    } catch (error: any) {
        console.error("Delete order error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete order" }, { status: 500 });
    }
}