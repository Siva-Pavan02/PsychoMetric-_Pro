import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#10233d]">Audit Log</h1>
        <p className="text-sm text-slate-500">Recent administrative actions.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold">Time</th>
                <th className="px-6 py-4 font-bold">Action</th>
                <th className="px-6 py-4 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-bold text-[#10233d]">
                    {log.action}
                  </td>
                  <td className="px-6 py-4">
                    {log.details ? (
                      <pre className="max-w-md overflow-x-auto text-[10px] text-slate-400">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-slate-300 italic">None</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
