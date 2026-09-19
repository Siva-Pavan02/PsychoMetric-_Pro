import { db } from "./db";
import { after } from "next/server";

export function logAdminAction(action: string, details?: unknown) {
  after(async () => {
    try {
      await db.auditLog.create({
        data: {
          action,
          details: details ? JSON.parse(JSON.stringify(details)) : null,
        },
      });
    } catch (err) {
      console.error("[audit] Failed to write audit log:", err);
    }
  });
}
