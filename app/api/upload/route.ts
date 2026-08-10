import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";

// Increase body size limit for this route (Next.js App Router)
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = async (req: NextRequest) => {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 5MB." },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "uploads", "products");
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.name.split(".").pop();
        const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filepath = join(uploadDir, filename);

        // Save file to public/uploads/products
        await writeFile(filepath, buffer);

        // Return the file URL
        const fileUrl = `/uploads/products/${filename}`;

        return NextResponse.json({
            success: true,
            filename,
            url: fileUrl,
            size: file.size,
            type: file.type,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
};
