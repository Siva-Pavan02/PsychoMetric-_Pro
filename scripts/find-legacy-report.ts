import { db } from "../src/lib/db";

async function run() {
  const allReports = await db.report.findMany({
    orderBy: { createdAt: "asc" },
  });
  
  const legacy = allReports.find(r => !(r.content as any).methodology);
  if (legacy) {
    console.log("Legacy Report ID:", legacy.id);
  } else {
    console.log("No Legacy Report found.");
  }
}

run().catch(console.error).finally(() => process.exit());
