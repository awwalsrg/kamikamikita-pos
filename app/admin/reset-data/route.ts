import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
    try {
        await prisma.$transaction([
            prisma.orderItem.deleteMany(),
            prisma.order.deleteMany(),
            prisma.attendance.deleteMany(),
        ]);

        return NextResponse.json({ success: true, message: "Data dummy berhasil dibersihkan!" });
    } catch (error) {
        console.error("Reset error:", error);
        return NextResponse.json({ success: false, error: "Gagal membersihkan data di database" }, { status: 500 });
    }
}
