import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for registering employee face
const registerFaceSchema = z.object({
    userId: z.string().min(1),
    faceDescriptor: z.array(z.number()).min(128).max(128), // Face-API.js uses 128 descriptors
    faceImageUrl: z.string().optional(),
    confidence: z.number().min(0).max(1).default(0.8),
});

// GET - Fetch all registered faces (for face matching)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const outletId = searchParams.get("outletId");

        const where: any = {};
        if (outletId) {
            where.user = {
                outletId: outletId,
            };
        }

        const faces = await prisma.employeeFace.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        outletId: true,
                    },
                },
            },
        });

        // Convert to format needed for face matching
        const faceData = faces.map((face) => ({
            userId: face.userId,
            name: face.user.name,
            descriptor: JSON.parse(face.faceDescriptor),
            confidence: Number(face.confidence),
        }));

        return NextResponse.json({
            success: true,
            faces: faceData,
            count: faces.length,
        });
    } catch (error) {
        console.error("Error fetching employee faces:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch employee faces" },
            { status: 500 }
        );
    }
}

// POST - Register new face for employee
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = registerFaceSchema.parse(body);

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: validated.userId },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Check if face already registered
        const existingFace = await prisma.employeeFace.findUnique({
            where: { userId: validated.userId },
        });

        if (existingFace) {
            // Update existing face registration
            const updatedFace = await prisma.employeeFace.update({
                where: { userId: validated.userId },
                data: {
                    faceDescriptor: JSON.stringify(validated.faceDescriptor),
                    faceImageUrl: validated.faceImageUrl,
                    confidence: validated.confidence,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            });

            // Update user faceRegistered status
            await prisma.user.update({
                where: { id: user.id },
                data: { faceRegistered: true },
            });

            return NextResponse.json({
                success: true,
                face: updatedFace,
                message: "Face registration updated successfully",
            });
        }

        // Create new face registration
        const newFace = await prisma.employeeFace.create({
            data: {
                userId: validated.userId,
                faceDescriptor: JSON.stringify(validated.faceDescriptor),
                faceImageUrl: validated.faceImageUrl,
                confidence: validated.confidence,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        // Update user faceRegistered status
        await prisma.user.update({
            where: { id: user.id },
            data: { faceRegistered: true },
        });

        return NextResponse.json({
            success: true,
            face: newFace,
            message: "Face registered successfully",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: "Validation error", details: (error as any).errors || error.message },
                { status: 400 }
            );
        }
        console.error("Error registering face:", error);
        return NextResponse.json(
            { success: false, error: "Failed to register face" },
            { status: 500 }
        );
    }
}

// DELETE - Remove face registration
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "userId is required" },
                { status: 400 }
            );
        }

        // Delete face registration
        await prisma.employeeFace.delete({
            where: { userId: userId },
        });

        // Update user faceRegistered status
        await prisma.user.update({
            where: { id: userId },
            data: { faceRegistered: false },
        });

        return NextResponse.json({
            success: true,
            message: "Face registration removed successfully",
        });
    } catch (error) {
        console.error("Error removing face registration:", error);
        return NextResponse.json(
            { success: false, error: "Failed to remove face registration" },
            { status: 500 }
        );
    }
}
