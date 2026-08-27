import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL belum diatur");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

type Menu = { sku: string; name: string; category: "FOOD" | "BEVERAGE" | "SNACK"; price: number; description?: string };

const menu: Menu[] = [
    // Coffee — harga Hot/Cold dibuat sebagai item terpisah agar langsung terlihat di kasir
    { sku: "BEV-AMERICANO-H", name: "Americano (Hot)", category: "BEVERAGE", price: 18000 },
    { sku: "BEV-AMERICANO-C", name: "Americano (Cold)", category: "BEVERAGE", price: 20000 },
    { sku: "BEV-CAPPUCCINO-H", name: "Cappuccino (Hot)", category: "BEVERAGE", price: 20000 },
    { sku: "BEV-CAPPUCCINO-C", name: "Cappuccino (Cold)", category: "BEVERAGE", price: 22000 },
    { sku: "BEV-SANGER-H", name: "Sanger (Hot)", category: "BEVERAGE", price: 20000 },
    { sku: "BEV-SANGER-C", name: "Sanger (Cold)", category: "BEVERAGE", price: 22000 },
    // Special coffee
    { sku: "BEV-GULA-AREN", name: "Kopi Susu Gula Aren", category: "BEVERAGE", price: 28000 },
    { sku: "BEV-CREME-BRULEE", name: "Kopi Susu Creme Brulee", category: "BEVERAGE", price: 28000 },
    { sku: "BEV-CARAMEL", name: "Kopi Susu Caramel", category: "BEVERAGE", price: 28000 },
    { sku: "BEV-CREAMY-NUTTY", name: "Creamy Nutty", category: "BEVERAGE", price: 28000 },
    { sku: "BEV-KACANG", name: "Kopi Susu Kacang", category: "BEVERAGE", price: 28000 },
    // Flavored coffee
    { sku: "BEV-MIXFRUIT", name: "Mixfruit Coffee", category: "BEVERAGE", price: 28000, description: "Coffee, fruity, with slight acidity" },
    { sku: "BEV-HONEY", name: "Honey Coffee", category: "BEVERAGE", price: 28000, description: "Coffee with natural honey sweetness" },
    { sku: "BEV-PICK-ME", name: "Pick Me Coffee", category: "BEVERAGE", price: 28000, description: "Coffee with strawberry & lychee flavors" },
    { sku: "BEV-OREO", name: "Oreo Dream", category: "BEVERAGE", price: 30000 },
    { sku: "BEV-LOTUS", name: "Lotus Regal Bliss", category: "BEVERAGE", price: 30000 },
    // Food
    { sku: "FOOD-KATSU-CURRY", name: "Katsu Curry Japan", category: "FOOD", price: 35000 },
    { sku: "FOOD-AYAM-LADA", name: "Ayam Lada Hitam", category: "FOOD", price: 35000 },
    { sku: "FOOD-AYAM-MATAH", name: "Ayam Sambal Matah", category: "FOOD", price: 20000 },
    { sku: "FOOD-MATAU-BREAD", name: "Matau Bread", category: "FOOD", price: 28000 },
    { sku: "FOOD-MIX-PLATTER", name: "Mix Platter", category: "FOOD", price: 25000 },
    { sku: "FOOD-INDOMIE-TORI", name: "Indomie Tori Kara", category: "FOOD", price: 30000 },
    { sku: "FOOD-HOTDOG", name: "Hotdog", category: "FOOD", price: 25000 },
    { sku: "SNACK-CIRENG", name: "Cireng", category: "SNACK", price: 22000 },
    { sku: "SNACK-DIMSUM", name: "Dimsum Ayam", category: "SNACK", price: 15000 },
    { sku: "SNACK-TAHU-WALIK", name: "Tahu Walik", category: "SNACK", price: 18000 },
    { sku: "SNACK-TOAST-CHOC", name: "Toast Coklat", category: "SNACK", price: 20000 },
    { sku: "SNACK-RISOL-AYAM", name: "Risol Ayam", category: "SNACK", price: 18000 },
];

async function main() {
    const outlet = await prisma.outlet.findFirst({ where: { isActive: true } }) ?? await prisma.outlet.create({ data: { name: "Kamikamikita Coffee", address: "Medan", taxRate: 0.11 } });
    for (const item of menu) {
        const product = await prisma.product.upsert({
            where: { sku: item.sku },
            update: { name: item.name, description: item.description, category: item.category, sellingPrice: item.price, isActive: true },
            create: { sku: item.sku, name: item.name, description: item.description, category: item.category, costPrice: Math.round(item.price * 0.55), sellingPrice: item.price, isActive: true },
        });
        await prisma.outletProduct.upsert({
            where: { outletId_productId: { outletId: outlet.id, productId: product.id } },
            update: { isAvailable: true, currentStock: { set: 999 } },
            create: { outletId: outlet.id, productId: product.id, currentStock: 999, minStock: 5, isAvailable: true },
        });
    }
    console.log(`MENU_OK outlet=${outlet.id} products=${menu.length}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
