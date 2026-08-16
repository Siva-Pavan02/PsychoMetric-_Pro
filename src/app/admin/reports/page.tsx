import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const pageSize = 20;

  const [reports, total] = await Promise.all([
    db.report.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        assessment: {
          select: { participant: { select: { id: true, name: true, email: true } } }
        }
      },
    }),
    db.report.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1e3a5f] mb-1">Reports</h1>
        <p className="text-slate-500 text-sm">Generated personality reports.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Participant</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">PDF</th>
                <th className="px-6 py-4">Email Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => {
                const date = new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
                
                const participant = r.assessment?.participant;
                
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {participant ? (
                        <Link href={`/admin/participants/${participant.id}`} className="font-semibold text-[#1e3a5f] hover:underline">
                          {participant.name}
                        </Link>
                      ) : (
                        <span className="text-slate-500 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Generated</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">Available</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 italic">
                      Pending/N/A
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{date}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <Link href={`/report/${r.id}`} target="_blank" className="text-[#1e3a5f] font-semibold text-sm hover:underline">
                        View
                      </Link>
                      <Link href={`/api/report/${r.id}/pdf`} className="text-[#1e3a5f] font-semibold text-sm hover:underline">
                        PDF
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No reports generated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="text-xs text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link href={`/admin/reports?page=${currentPage - 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Prev
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={`/admin/reports?page=${currentPage + 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
