import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, seed) uses the direct connection when one is configured
// (Neon's unpooled URL); the app itself uses DATABASE_URL through the adapter.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
