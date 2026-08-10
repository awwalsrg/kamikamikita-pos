import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


export const dynamic = "force-dynamic";

// GET - List products
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const available = searchParams.get("available") === "true";
        const category = searchParams.get("category");
        const search = searchParams.get("search");
        const outletId = searchParams.get("outletId");

        const where: any = {
            isActive: true,
        };

        if (available) {
            where.OutletProduct = {
                some: {
                    isAvailable: true,
                    currentStock: { gt: 0 },
                },
            };
        }

        if (category) {
            where.category = category;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
            ];
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                outletProducts: outletId
                    ? {
                        where: { outletId },
                    }
                    : true,
            },
            orderBy: { name: "asc" },
        });

        // Transform to include stock info
        const transformed = products.map((product) => {
            const outletProduct = product.outletProducts[0];
            return {
                id: product.id,
                sku: product.sku,
                name: product.name,
                category: product.category,
                sellingPrice: Number(product.sellingPrice),
                costPrice: Number(product.costPrice),
                imageUrl: product.imageUrl,
                stock: outletProduct?.currentStock || 0,
                isAvailable: outletProduct?.isAvailable ?? true,
            };
        });

        return NextResponse.json({ products: transformed });
    } catch (error) {
        console.error("Products API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch products" },
            { status: 500 }
        );
    }
}

// POST - Create product
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            sku,
            name,
            description,
            category,
            costPrice,
            sellingPrice,
            imageUrl,
            outletId,
            initialStock = 0,
        } = body;

        // Validate required fields
        if (!sku || !name || !sellingPrice) {
            return NextResponse.json(
                { error: "SKU, name, and sellingPrice are required" },
                { status: 400 }
            );
        }

        // Check if SKU exists
        const existing = await prisma.product.findUnique({ where: { sku } });
        if (existing) {
            return NextResponse.json(
                { error: "SKU already exists" },
                { status: 400 }
            );
        }

        const product = await prisma.product.create({
            data: {
                sku,
                name,
                description,
                category,
                costPrice,
                sellingPrice,
                imageUrl,
                outletProducts: outletId
                    ? {
                        create: {
                            outletId,
                            currentStock: initialStock,
                            isAvailable: initialStock > 0,
                        },
                    }
                    : undefined,
            },
            include: {
                outletProducts: true,
            },
        });

        return NextResponse.json({ product }, { status: 201 });
    } catch (error) {
        console.error("Create product error:", error);
        return NextResponse.json(
            { error: "Failed to create product" },
            { status: 500 }
        );
    }
}
