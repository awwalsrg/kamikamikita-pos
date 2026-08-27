import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for creating attendance
const createAttendanceSchema = z.object({
    userId: z.string().min(1),
    type: z.enum(["CHECK_IN", "CHECK_OUT"]),
    confidence: z.number().min(0).max(1).optional(),
    imageUrl: z.string().optional(),
    location: z.string().optional(),
    deviceInfo: z.string().optional(),
    notes: z.string().optional(),
});

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const type = searchParams.get("type");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        // Single-record fetch (for detail modal) — include full imageUrl
        if (id) {
            const attendance = await prisma.attendance.findUnique({
                where: { id },
                include: {
                    user: { select: { id: true, name: true, email: true, role: true } },
                },
            });
            if (!attendance) {
                return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
            }
            return NextResponse.json({ success: true, attendance });
        }

        const where: any = {};

        if (userId) where.userId = userId;
        if (type) where.type = type;

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const [attendances, total] = await Promise.all([
            prisma.attendance.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, role: true },
                    },
                },
                orderBy: { timestamp: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.attendance.count({ where }),
        ]);

        // Strip large base64 imageUrl from list response to avoid bloating the payload.
        // The full image is fetched individually via GET /api/attendance?id=<id>.
        const sanitized = attendances.map(({ imageUrl, ...rest }) => ({
            ...rest,
            hasImage: !!imageUrl,
        }));

        return NextResponse.json({
            success: true,
            attendances: sanitized,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch attendance records" },
            { status: 500 }
        );
    }
}

// POST - Create attendance record (face recognition check-in/out)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = createAttendanceSchema.parse(body);

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: validated.userId },
            include: { employeeFace: true },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Foto attendance tidak membutuhkan EmployeeFace/face descriptor.
        // Jika descriptor dikirim oleh mode lama, tetap dapat dipakai; mode foto cukup userId + imageUrl.

        // Check if already checked in/out today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingAttendance = await prisma.attendance.findFirst({
            where: {
                userId: validated.userId,
                type: validated.type,
                timestamp: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });

        if (existingAttendance && validated.type === "CHECK_IN") {
            return NextResponse.json(
                { success: false, error: "Already checked in today" },
                { status: 400 }
            );
        }

        // Create attendance record
        const attendance = await prisma.attendance.create({
            data: {
                userId: validated.userId,
                employeeFaceId: user.employeeFace?.id,
                type: validated.type,
                confidence: validated.confidence,
                imageUrl: validated.imageUrl,
                location: validated.location || request.headers.get("x-forwarded-for") || "unknown",
                deviceInfo: validated.deviceInfo,
                status: validated.confidence && validated.confidence >= 0.8 ? "VALID" : "PENDING",
                notes: validated.notes,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Update user face registered status
        if (validated.confidence !== undefined && !user.faceRegistered) {
            await prisma.user.update({
                where: { id: user.id },
                data: { faceRegistered: true },
            });
        }

        return NextResponse.json({
            success: true,
            attendance,
            message: `${validated.type === "CHECK_IN" ? "Check-in" : "Check-out"} successful`,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: (error as any).errors || error.message },
                { status: 400 }
            );
        }
        console.error("Error creating attendance:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create attendance record" },
            { status: 500 }
        );
    }
}

// DELETE - Delete attendance record by ID
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Attendance ID is required" },
                { status: 400 }
            );
        }

        // Check if attendance exists
        const existingAttendance = await prisma.attendance.findUnique({
            where: { id },
        });

        if (!existingAttendance) {
            return NextResponse.json(
                { success: false, error: "Attendance record not found" },
                { status: 404 }
            );
        }

        // Delete the attendance record
        await prisma.attendance.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Attendance record deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting attendance:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete attendance record" },
            { status: 500 }
        );
    }
}
