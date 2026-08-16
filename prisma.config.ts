import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL ?? "";

// Do not invent a Neon URL. Migrations require a direct connection.
const directUrl = process.env.DIRECT_URL;

if (!directUrl && databaseUrl.includes("-pooler")) {
  console.error("❌ Prisma Migrations require a non-pooled connection to Neon.");
  console.error("Please add DIRECT_URL to your .env.local file.");
  process.exit(1);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: directUrl || databaseUrl,
  },
});
