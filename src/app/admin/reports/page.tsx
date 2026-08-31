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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#10233d]">Reports</h1>
          <p className="mt-2 text-sm text-slate-600">Generated personality reports.</p>
        </div>
        <span className="self-start rounded-full bg-[#edf3f8] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1d4f7a] sm:self-auto">
          {total} generated
        </span>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 shadow-[0_24px_38px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Generated personality reports, page {currentPage} of {Math.max(totalPages, 1)}
            </caption>
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-4">Participant</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">PDF</th>
                <th scope="col" className="px-6 py-4">Email Status</th>
                <th scope="col" className="px-6 py-4">Date</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reports.map((r) => {
                const date = new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

                const participant = r.assessment?.participant;

                return (
                  <tr key={r.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      {participant ? (
                        <Link
                          href={`/admin/participants/${participant.id}`}
                          aria-label={`View participant ${participant.name}`}
                          className="font-bold text-[#10233d] hover:text-[#1d4f7a] hover:underline"
                        >
                          {participant.name}
                        </Link>
                      ) : (
                        <span className="italic text-slate-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                        Generated
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                        Available
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs italic text-slate-500">
                      Not tracked
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">{date}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/report/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View report for ${participant?.name ?? "unknown participant"} in a new tab`}
                          className="rounded-full text-xs font-bold uppercase tracking-[0.14em] text-[#1d4f7a] hover:underline"
                        >
                          View
                        </Link>
                        <a
                          href={`/api/report/${r.id}/pdf`}
                          download="report.pdf"
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Download PDF report for ${participant?.name ?? "unknown participant"}`}
                          className="rounded-full text-xs font-bold uppercase tracking-[0.14em] text-[#1d4f7a] hover:underline"
                        >
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">No reports generated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <nav
            aria-label="Reports pagination"
            className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4"
          >
            <span className="text-xs font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/reports?page=${currentPage - 1}`}
                  rel="prev"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-[#10233d]"
                >
                  Prev
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/reports?page=${currentPage + 1}`}
                  rel="next"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-[#10233d]"
                >
                  Next
                </Link>
              )}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}
