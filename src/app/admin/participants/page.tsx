import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const pageSize = 20;

  const [participants, total] = await Promise.all([
    db.participant.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        assessments: { select: { status: true }, orderBy: { startedAt: "desc" }, take: 1 },
        payments: { select: { status: true, amount: true, currency: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.participant.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1e3a5f] mb-1">Participants</h1>
        <p className="text-slate-500 text-sm">Manage and view all registered participants.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Assessment</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {participants.map((p) => {
                const payment = p.payments?.[0];
                const assessment = p.assessments?.[0];
                const isPaid = payment?.status === "SUCCESS";
                const isCompleted = assessment?.status === "COMPLETED";
                const date = new Date(p.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#1e3a5f]">{p.name}</td>
                    <td className="px-6 py-4 text-slate-500">{p.email}</td>
                    <td className="px-6 py-4">
                      {isPaid ? (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">Paid</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isCompleted ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Completed</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{date}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/participants/${p.id}`} className="text-[#1e3a5f] font-semibold text-sm hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No participants found.</td>
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
                <Link href={`/admin/participants?page=${currentPage - 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Prev
                </Link>
              )}
              {currentPage < totalPages && (
                <Link href={`/admin/participants?page=${currentPage + 1}`} className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50">
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
