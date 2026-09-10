import { getAdminMetrics, paiseToRupees } from "@/lib/admin/metrics";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: "slate" | "blue" | "green" | "amber" }) {
  const toneClasses = {
    slate: "bg-slate-50 text-slate-700",
    blue: "bg-[#edf3f8] text-[#10233d]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-[1.5rem] border border-slate-200 p-5 ${toneClasses[tone ?? "slate"]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#10233d]">{value}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const m = await getAdminMetrics();

  const refreshedAt = formatDateTime(m.calculatedAt);

  const recentActivity = await db.participant.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      assessments: { select: { status: true }, orderBy: { startedAt: "desc" }, take: 1 },
      payments: { select: { status: true, amount: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#10233d]">Dashboard overview</h1>
        </div>
        <p className="text-xs font-medium text-slate-500">Last refreshed {refreshedAt}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Stat label="Participants" value={m.totalParticipants} tone="blue" />
        <Stat label="Completed" value={m.completedAssessments} tone="green" />
        <Stat label="Pending" value={m.pendingAssessments} tone="amber" />
        <Stat label="Successful payments" value={m.successfulPaymentCount} tone="green" />
        <Stat label="Failed payments" value={m.failedPaymentCount} tone="slate" />
        <Stat label="Total revenue" value={m.totalRevenueFormatted} tone="blue" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_24px_38px_rgba(15,23,42,0.07)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-lg font-black tracking-[-0.04em] text-[#10233d]">Revenue breakdown</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Live</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Successful payments</p>
              <p className="mt-2 text-2xl font-black text-[#10233d]">{m.successfulPaymentCount}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Avg successful payment</p>
              <p className="mt-2 text-2xl font-black text-[#10233d]">
                {m.successfulPaymentCount > 0 ? `₹${m.avgSuccessfulPaymentRupees.toFixed(0)}` : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">Total revenue</p>
              <p className="mt-2 text-2xl font-black text-emerald-700">{m.totalRevenueFormatted}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_24px_38px_rgba(15,23,42,0.07)]">
          <h2 className="text-lg font-black tracking-[-0.04em] text-[#10233d]">Payment reconciliation</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-600">Successful</span>
              <span className="font-black text-emerald-700">{m.successfulPaymentCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-600">Failed</span>
              <span className="font-black text-red-600">{m.failedPaymentCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-600">Pending / created</span>
              <span className="font-black text-amber-700">{m.pendingPaymentCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
              <span className="font-bold text-slate-700">Total revenue</span>
              <span className="font-black text-emerald-700">{m.totalRevenueFormatted}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 shadow-[0_24px_38px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black tracking-[-0.04em] text-[#10233d]">Recent activity</h2>
          <Link href="/admin/participants" className="text-xs font-bold uppercase tracking-[0.14em] text-[#1d4f7a]">
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Participant</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentActivity.map((p) => {
                const payment = p.payments?.[0];
                const assessment = p.assessments?.[0];
                const isPaid = payment?.status === "SUCCESS";
                const isCompleted = assessment?.status === "COMPLETED";
                const date = formatDateTime(p.createdAt);

                let eventStr = "Registered";
                if (isCompleted) eventStr = "Assessment completed";
                else if (isPaid) eventStr = "Payment successful";
                else if (assessment) eventStr = "Assessment started";

                const displayAmount = isPaid && payment?.amount != null
                  ? `₹${paiseToRupees(payment.amount).toFixed(0)}`
                  : "—";

                return (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-bold text-[#10233d]">{p.name}</td>
                    <td className="px-6 py-4 text-slate-600">{eventStr}</td>
                    <td className="px-6 py-4 text-slate-600">{displayAmount}</td>
                    <td className="px-6 py-4">
                      {isCompleted ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">Completed</span>
                      ) : isPaid ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">Paid</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{date}</td>
                  </tr>
                );
              })}

              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">No recent activity.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

