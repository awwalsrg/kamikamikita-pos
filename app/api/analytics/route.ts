import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET - Analytics data (top products, daily sales, profit)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        const where: any = {
            paymentStatus: "PAID",
        };
        if (startDate || endDate) {
            where.createdAt = dateFilter;
        }

        // Top products with profit
        const orderItems = await prisma.orderItem.groupBy({
            by: ["productName"],
            where: { order: where },
            _sum: { quantity: true, totalPrice: true },
            _count: true,
            orderBy: { _sum: { quantity: "desc" } },
            take: 10,
        });

        // Fetch product costPrice for top products to calculate profit
        const topProductNames = orderItems.map((item) => item.productName);
        const products = await prisma.product.findMany({
            where: { name: { in: topProductNames } },
            select: { name: true, costPrice: true },
        });
        const costPriceMap: Record<string, number> = {};
        for (const p of products) {
            costPriceMap[p.name] = Number(p.costPrice);
        }

        // Daily sales with profit
        const ordersWithItems = await prisma.order.findMany({
            where,
            select: {
                createdAt: true,
                totalAmount: true,
                items: {
                    select: {
                        quantity: true,
                        totalPrice: true,
                        product: { select: { costPrice: true } },
                    },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        // Group by date with revenue & profit
        const dailySales: Record<string, { count: number; total: number; profit: number; hpp: number }> = {};
        for (const order of ordersWithItems) {
            const date = new Date(order.createdAt).toISOString().slice(0, 10);
            if (!dailySales[date]) dailySales[date] = { count: 0, total: 0, profit: 0, hpp: 0 };
            dailySales[date].count += 1;
            dailySales[date].total += Number(order.totalAmount);
            for (const item of order.items) {
                const cost = Number(item.product.costPrice) * item.quantity;
                dailySales[date].hpp += cost;
                dailySales[date].profit += Number(item.totalPrice) - cost;
            }
        }

        // Compute totals
        const totalOmzet = Object.values(dailySales).reduce((s, d) => s + d.total, 0);
        const totalHPP = Object.values(dailySales).reduce((s, d) => s + d.hpp, 0);
        const totalProfit = Object.values(dailySales).reduce((s, d) => s + d.profit, 0);
        const totalOrders = Object.values(dailySales).reduce((s, d) => s + d.count, 0);

        // Today's attendance
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayAttendance = await prisma.attendance.findMany({
            where: {
                timestamp: { gte: todayStart, lte: todayEnd },
            },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { timestamp: "asc" },
        });

        return NextResponse.json({
            topProducts: orderItems.map((item) => ({
                productName: item.productName,
                totalQuantity: item._sum.quantity,
                totalRevenue: Number(item._sum.totalPrice),
                totalCost: (costPriceMap[item.productName] || 0) * Number(item._sum.quantity),
                orderCount: item._count,
            })),
            dailySales: Object.entries(dailySales).map(([date, data]) => ({
                date,
                orderCount: data.count,
                totalRevenue: data.total,
                totalCost: data.hpp,
                profit: data.profit,
            })),
            summary: {
                totalOmzet,
                totalHPP,
                totalProfit,
                totalOrders,
            },
            todayAttendance: todayAttendance.map((a) => ({
                id: a.id,
                userName: a.user.name,
                type: a.type,
                status: a.status,
                imageUrl: a.imageUrl,
                timestamp: a.timestamp,
            })),
        });
    } catch (error) {
        console.error("Analytics API error:", error);
        return NextResponse.json({ error: "Gagal memuat analytics" }, { status: 500 });
    }
}
