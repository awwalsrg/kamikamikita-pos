import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });


export const dynamic = "force-dynamic";

// Generate order number
function generateOrderNumber() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `ORD-${date}-${random}`;
}

// GET - List orders
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const outletId = searchParams.get("outletId");
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "50");

        const where: any = {};
        if (outletId) where.outletId = outletId;
        if (status) where.status = status;

        const orders = await prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                cashier: {
                    select: { id: true, name: true },
                },
                customer: true,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error("Orders API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch orders" },
            { status: 500 }
        );
    }
}

// POST - Create order (checkout)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            outletId,
            cashierId,
            customerId,
            items,
            subtotal,
            taxAmount,
            discountAmount = 0,
            totalAmount,
            paymentMethod,
            paidAmount,
            changeAmount = 0,
            type = "DINE_IN",
            tableNumber,
            notes,
        } = body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "Order items are required" },
                { status: 400 }
            );
        }

        // Use transaction to ensure data consistency
        const order = await prisma.$transaction(async (tx) => {
            // Create order
            const newOrder = await tx.order.create({
                data: {
                    outletId: outletId || "default-outlet-id", // Should be from session
                    orderNumber: generateOrderNumber(),
                    type,
                    status: "COMPLETED",
                    subtotal,
                    taxAmount,
                    discountAmount,
                    totalAmount,
                    paymentMethod,
                    paidAmount,
                    changeAmount,
                    tableNumber,
                    notes,
                    paymentStatus: "PAID",
                    completedAt: new Date(),
                    cashierId,
                    customerId,
                },
            });

            // Create order items and update stock
            for (const item of items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });

                if (!product) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                // Create order item
                await tx.orderItem.create({
                    data: {
                        orderId: newOrder.id,
                        productId: item.productId,
                        productName: product.name,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        totalPrice: item.price * item.quantity,
                        notes: item.notes,
                    },
                });

                // Update stock in OutletProduct
                if (outletId) {
                    const outletProduct = await tx.outletProduct.findUnique({
                        where: {
                            outletId_productId: {
                                outletId,
                                productId: item.productId,
                            },
                        },
                    });

                    if (outletProduct) {
                        await tx.outletProduct.update({
                            where: { id: outletProduct.id },
                            data: {
                                currentStock: outletProduct.currentStock - item.quantity,
                                isAvailable: outletProduct.currentStock - item.quantity > 0,
                            },
                        });

                        // Create inventory log
                        await tx.inventory.create({
                            data: {
                                outletId,
                                productId: item.productId,
                                type: "SALE",
                                quantity: -item.quantity,
                                previousStock: outletProduct.currentStock,
                                currentStock: outletProduct.currentStock - item.quantity,
                                note: `Sale - Order ${newOrder.orderNumber}`,
                                createdBy: cashierId || "system",
                            },
                        });
                    }
                }
            }

            return newOrder;
        });

        // Fetch complete order with items
        const completeOrder = await prisma.order.findUnique({
            where: { id: order.id },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });

        return NextResponse.json(
            { order: completeOrder },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create order error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create order" },
            { status: 500 }
        );
    }
}
