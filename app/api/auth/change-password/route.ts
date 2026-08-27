import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, currentPassword, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: "userId dan newPassword wajib diisi" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        // Verify current password
        if (currentPassword && user.password) {
            const valid = await bcrypt.compare(currentPassword, user.password);
            if (!valid) {
                return NextResponse.json({ error: "Password lama salah" }, { status: 401 });
            }
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

        return NextResponse.json({ success: true, message: "Password berhasil diubah" });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Gagal mengubah password" }, { status: 500 });
    }
}