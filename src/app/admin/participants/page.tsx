import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/admin/metrics";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/date";
import CleanupOrphansButton from "@/components/admin/CleanupOrphansButton";

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
        payments: { select: { status: true, amount: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.participant.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#10233d]">Participants</h1>
          <p className="mt-2 text-sm text-slate-600">All registered participants.</p>
        </div>
        <div className="flex flex-col gap-2 self-start sm:self-auto sm:items-end">
          <span className="rounded-full bg-[#edf3f8] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1d4f7a]">
            {total} total
          </span>
          <CleanupOrphansButton />
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 shadow-[0_24px_38px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Registered participants, page {currentPage} of {Math.max(totalPages, 1)}
            </caption>
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-4">Name</th>
                <th scope="col" className="px-6 py-4">Email</th>
                <th scope="col" className="px-6 py-4">Payment</th>
                <th scope="col" className="px-6 py-4">Amount</th>
                <th scope="col" className="px-6 py-4">Assessment</th>
                <th scope="col" className="px-6 py-4">Date</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {participants.map((p) => {
                const payment = p.payments?.[0];
                const assessment = p.assessments?.[0];
                const isPaid = payment?.status === "SUCCESS";
                const isCompleted = assessment?.status === "COMPLETED";
                const date = formatDateTime(p.createdAt);
                // amount in paise — convert to rupees at display boundary
                const displayAmount = isPaid && payment?.amount != null
                  ? `₹${paiseToRupees(payment.amount).toFixed(0)}`
                  : "—";

                return (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-bold text-[#10233d]">{p.name}</td>
                    <td className="px-6 py-4 text-slate-600">{p.email}</td>
                    <td className="px-6 py-4">
                      {isPaid ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                          SUCCESS
                        </span>
                      ) : payment?.status === "FAILED" ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
                          FAILED
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                          {payment?.status ?? "NONE"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{displayAmount}</td>
                    <td className="px-6 py-4">
                      {isCompleted ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                          COMPLETED
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
                          {assessment?.status ?? "NONE"}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">{date}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/participants/${p.id}`}
                        aria-label={`View participant ${p.name}`}
                        className="rounded-full text-xs font-bold uppercase tracking-[0.14em] text-[#1d4f7a] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    No participants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <nav
            aria-label="Participants pagination"
            className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4"
          >
            <span className="text-xs font-medium text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/participants?page=${currentPage - 1}`}
                  rel="prev"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-[#10233d]"
                >
                  Prev
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/participants?page=${currentPage + 1}`}
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

