import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, pin, password } = body;

        let user;

        if (pin) {
            // Login with PIN (for cashiers)
            user = await prisma.user.findFirst({
                where: {
                    pin: pin,
                    isActive: true,
                },
            });
        } else if (email && password) {
            // Login with email & password
            user = await prisma.user.findFirst({
                where: {
                    email: email.toLowerCase(),
                    isActive: true,
                },
            });

            if (user && user.password) {
                const valid = await bcrypt.compare(password, user.password);
                if (!valid) {
                    user = null;
                }
            }
        }

        if (!user) {
            return NextResponse.json(
                { error: "Email/PIN atau password salah" },
                { status: 401 }
            );
        }

        // Return user data (without password)
        const { password: _, ...userData } = user;

        return NextResponse.json({
            success: true,
            user: userData,
        });
    } catch (error) {
        console.error("Login API error:", error);
        return NextResponse.json(
            { error: "Terjadi kesalahan saat login" },
            { status: 500 }
        );
    }
}
