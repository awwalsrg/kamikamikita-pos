import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Menggunakan prisma['heldBill'] agar tidak error type checking
        const heldBills = await (prisma as any).heldBill.findMany({
            orderBy: { createdAt: 'asc' }
        });
        return NextResponse.json({ success: true, heldBills });
    } catch (error) {
        return NextResponse.json({ error: "Gagal memuat bill gantung" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { customerName, tableNumber, items } = body;

        // Menggunakan prisma['heldBill']
        const newHeldBill = await (prisma as any).heldBill.create({
            data: {
                customerName: customerName || "Tanpa Nama",
                tableNumber: tableNumber || "-",
                items: items,
            }
        });

        return NextResponse.json({ success: true, heldBill: newHeldBill });
    } catch (error) {
        return NextResponse.json({ error: "Gagal menyimpan bill gantung" }, { status: 500 });
    }
}