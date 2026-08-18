import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const reports = await db.report.findMany({ 
  take: 2, 
  select: { id: true, assessmentId: true, createdAt: true } 
});
console.log(JSON.stringify(reports, null, 2));

await db.$disconnect();