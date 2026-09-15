import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedDatabase } from "./seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

seedDatabase(prisma)
  .then((summary) => {
    console.log(`seed ok: ${summary.accounts} accounts, ${summary.categories} categories, ${summary.rules} rules, ${summary.cnaeMappings} CNAE mappings`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
