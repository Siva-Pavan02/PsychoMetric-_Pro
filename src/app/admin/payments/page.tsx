import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/admin/metrics";
import Link from "next/link";

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
      <div>
        <h1 className="text-2xl font-black text-[#1e3a5f] mb-1">Payments</h1>
        <p className="text-slate-500 text-sm">Server-verified successful transactions only.</p>
      </div>

      <div className="bg-neu-bg rounded-3xl shadow-neu-flat border-4 border-neu-bg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-neu-bg shadow-neu-pressed text-slate-500 text-xs uppercase font-black">
              <tr>
                <th className="px-6 py-4">Participant</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Payment Gateway</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Payment ID</th>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {payments.map((p) => {
                const date = new Date(p.createdAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                // amount stored in paise — convert to rupees at display boundary
                const displayAmount = `₹${paiseToRupees(p.amount).toFixed(0)}`;

                return (
                  <tr key={p.id} className="hover:bg-neu-bg hover:shadow-neu-pressed transition-all">
                    <td className="px-6 py-4">
                      {p.participant ? (
                        <Link
                          href={`/admin/participants/${p.participant.id}`}
                          className="font-semibold text-[#1e3a5f] hover:underline"
                        >
                          {p.participant.name}
                        </Link>
                      ) : (
                        <span className="text-slate-500 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">{displayAmount}</td>
                    <td className="px-6 py-4 text-slate-600">Razorpay</td>
                    <td className="px-6 py-4 text-slate-400 italic text-xs">Not available</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      {p.razorpayPaymentId || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      {p.razorpayOrderId || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{date}</td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No successful payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="text-xs text-slate-500 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/payments?page=${currentPage - 1}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Prev
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/payments?page=${currentPage + 1}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
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
