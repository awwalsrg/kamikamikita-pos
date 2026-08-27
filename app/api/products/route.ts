import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const search = searchParams.get("search");

        const where: any = {
            isActive: true, // Ambil semua menu yang aktif
        };

        if (category && category !== "SEMUA") {
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
            include: { outletProducts: true },
            orderBy: { name: "asc" },
        });

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
                stock: outletProduct?.currentStock || 999, // F&B biasanya stok tak terbatas
                isAvailable: true, // Paksa selalu tersedia agar muncul di kasir
            };
        });

        return NextResponse.json({ products: transformed }, { status: 200 });
    } catch (error) {
        console.error("Products API (GET) Error:", error);
        return NextResponse.json({ error: "Gagal mengambil data produk" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sku, name, description, category, costPrice, sellingPrice, imageUrl, outletId, initialStock = 0 } = body;

        if (!sku || !name || sellingPrice === undefined || costPrice === undefined) {
            return NextResponse.json({ error: "SKU, Nama, Harga Jual, dan HPP wajib diisi" }, { status: 400 });
        }

        const existing = await prisma.product.findUnique({ where: { sku } });
        if (existing) {
            return NextResponse.json({ error: "SKU sudah terdaftar" }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                sku, name, description, category, costPrice, sellingPrice, imageUrl,
                outletProducts: outletId ? { create: { outletId, currentStock: initialStock, isAvailable: true } } : undefined,
            },
            include: { outletProducts: true },
        });

        return NextResponse.json({ message: "Produk berhasil ditambahkan", product }, { status: 201 });
    } catch (error) {
        console.error("Products API (POST) Error:", error);
        return NextResponse.json({ error: "Gagal menyimpan produk baru" }, { status: 500 });
    }
}
