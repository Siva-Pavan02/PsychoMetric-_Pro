/**
 * Minimal Prisma connectivity smoke test.
 * Run: node --env-file=.env.local scripts/db-check.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌  DATABASE_URL is not set. Edit .env.local first.");
  process.exit(1);
}

console.log("→ Connecting to:", url.replace(/:([^:@]+)@/, ":***@"));

const adapter = new PrismaPg({ connectionString: url });
const db      = new PrismaClient({ adapter });

try {
  // Raw ping
  await db.$queryRaw`SELECT 1`;
  console.log("✅  Database connection OK");

  // Table existence check
  const tables = await db.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("📋  Tables found:", tables.map(r => r.table_name).join(", ") || "(none — run prisma migrate dev)");

} catch (err) {
  console.error("❌  Database error:", err.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
