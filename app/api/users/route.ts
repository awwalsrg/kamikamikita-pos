import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true, role: true, faceRegistered: true },
            orderBy: { name: "asc" },
        });
        return NextResponse.json({ success: true, users });
    } catch (error) {
        console.error("Users API error:", error);
        return NextResponse.json({ success: false, error: "Gagal memuat karyawan" }, { status: 500 });
    }
}
