import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Setup Prisma dengan driver adapter untuk PostgreSQL
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL || "",
});

export const prisma = new PrismaClient({
    adapter,
});
