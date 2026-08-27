import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL belum diatur");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    try {
        const password = await bcrypt.hash("admin123", 10);
        const admins = [
            { name: "Boki", email: "boki@kamikamikita.com" },
            { name: "Partner", email: "partner@kamikamikita.com" },
        ];
        for (const admin of admins) {
            await prisma.user.upsert({
                where: { email: admin.email },
                update: { name: admin.name, password, role: "ADMIN", isActive: true },
                create: { email: admin.email, name: admin.name, password, role: "ADMIN", isActive: true },
            });
        }
        console.log("ADMIN_SEEDED:", admins.map(a => `${a.name} (${a.email})`).join(", "));
    } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });