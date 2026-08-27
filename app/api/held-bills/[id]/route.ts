import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, context: any) {
    try {
        const params = await context.params;
        const id = params.id;

        // Memaksa TypeScript tutup mata dengan (prisma as any)
        await (prisma as any).heldBill.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Gagal menghapus bill" }, { status: 500 });
    }
}