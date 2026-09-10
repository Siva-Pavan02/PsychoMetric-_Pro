import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/admin/metrics";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const pageSize = 20;

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      include: {
        participant: { select: { id: true, name: true, email: true } },
      },
    }),
    db.payment.count({ where: { status: "SUCCESS" } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#10233d]">Payments</h1>
          <p className="mt-2 text-sm text-slate-600">Server-verified successful transactions only.</p>
        </div>
        <span className="self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 sm:self-auto">
          {total} verified
        </span>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 shadow-[0_24px_38px_rgba(15,23,42,0.07)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Server-verified successful payments, page {currentPage} of {Math.max(totalPages, 1)}
            </caption>
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-4">Participant</th>
                <th scope="col" className="px-6 py-4">Amount</th>
                <th scope="col" className="px-6 py-4">Payment Gateway</th>
                <th scope="col" className="px-6 py-4">Payment Method</th>
                <th scope="col" className="px-6 py-4">Payment ID</th>
                <th scope="col" className="px-6 py-4">Order ID</th>
                <th scope="col" className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.map((p) => {
                const date = formatDateTime(p.createdAt);
                // amount stored in paise — convert to rupees at display boundary
                const displayAmount = `₹${paiseToRupees(p.amount).toFixed(0)}`;

                return (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      {p.participant ? (
                        <Link
                          href={`/admin/participants/${p.participant.id}`}
                          aria-label={`View participant ${p.participant.name}`}
                          className="font-bold text-[#10233d] hover:text-[#1d4f7a] hover:underline"
                        >
                          {p.participant.name}
                        </Link>
                      ) : (
                        <span className="italic text-slate-500">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-black text-emerald-700">{displayAmount}</td>
                    <td className="px-6 py-4 text-slate-600">Razorpay</td>
                    <td className="px-6 py-4 text-xs italic text-slate-500">Not available</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {p.razorpayPaymentId || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {p.razorpayOrderId || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">{date}</td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    No successful payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <nav
            aria-label="Payments pagination"
            className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4"
          >
            <span className="text-xs font-medium text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/payments?page=${currentPage - 1}`}
                  rel="prev"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-[#10233d]"
                >
                  Prev
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/payments?page=${currentPage + 1}`}
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

