import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL belum diatur");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    try {
        const outlet = await prisma.outlet.findFirst({ where: { isActive: true } }) ?? await prisma.outlet.create({ data: { name: "Kamikamikita Coffee" } });
        const staff = ["Zidan", "El", "Fitri", "Ccer"];
        for (const name of staff) {
            const email = `${name.toLowerCase().replace(/ /g, ".")}@kamikamikita.local`;
            await prisma.user.upsert({
                where: { email },
                update: { name, isActive: true, role: "CASHIER", outletId: outlet.id },
                create: { email, password: "face-attendance", name, role: "CASHIER", outletId: outlet.id },
            });
        }
        console.log("STAFF_SEEDED", staff.join(", "));
    } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
