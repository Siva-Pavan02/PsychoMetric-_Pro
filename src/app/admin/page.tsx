import { getAdminMetrics } from "@/lib/admin/metrics";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-[#1e3a5f]">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  const m = await getAdminMetrics();

  const refreshedAt = m.calculatedAt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Recent activity (5 most recent participants)
  const { db } = await import("@/lib/db");
  const recentActivity = await db.participant.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      assessments: { select: { status: true }, orderBy: { startedAt: "desc" }, take: 1 },
      payments: { select: { status: true, amount: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1e3a5f] mb-1">Dashboard Overview</h1>
          <p className="text-slate-500 text-sm">Real-time metrics from database.</p>
        </div>
        <p className="text-xs text-slate-400 tabular-nums">
          Last refreshed: {refreshedAt}
        </p>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Participants" value={m.totalParticipants} />
        <Stat label="Completed" value={m.completedAssessments} />
        <Stat label="Pending" value={m.pendingAssessments} />
        <Stat label="Successful Payments" value={m.successfulPaymentCount} />
        <Stat label="Failed Payments" value={m.failedPaymentCount} />
        <Stat
          label="Total Revenue"
          value={m.totalRevenueFormatted}
          sub="Successful payments only"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100 uppercase tracking-widest">
          Revenue Breakdown
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Successful Payments</p>
            <p className="text-2xl font-black text-[#1e3a5f]">{m.successfulPaymentCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-emerald-600">{m.totalRevenueFormatted}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Avg Successful Payment</p>
            <p className="text-2xl font-black text-[#1e3a5f]">
              {m.successfulPaymentCount > 0
                ? `₹${m.avgSuccessfulPaymentRupees.toFixed(0)}`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Reconciliation */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100 uppercase tracking-widest">
          Payment Reconciliation
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left pb-2">Status</th>
                <th className="text-right pb-2">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr>
                <td className="py-2 font-medium text-emerald-700">Successful</td>
                <td className="py-2 text-right font-bold">{m.successfulPaymentCount}</td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-red-600">Failed</td>
                <td className="py-2 text-right font-bold">{m.failedPaymentCount}</td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-amber-600">Pending / Created</td>
                <td className="py-2 text-right font-bold">{m.pendingPaymentCount}</td>
              </tr>
              <tr className="border-t-2 border-slate-200 font-bold">
                <td className="pt-3 text-[#1e3a5f]">Total Successful Revenue</td>
                <td className="pt-3 text-right text-emerald-600">{m.totalRevenueFormatted}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1e3a5f]">Recent Activity</h2>
          <Link href="/admin/participants" className="text-xs text-[#1e3a5f] font-bold hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Participant</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentActivity.map((p) => {
                const payment = p.payments?.[0];
                const assessment = p.assessments?.[0];
                const isPaid = payment?.status === "SUCCESS";
                const isCompleted = assessment?.status === "COMPLETED";
                const date = new Date(p.createdAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                let eventStr = "Registered";
                if (isCompleted) eventStr = "Assessment Completed";
                else if (isPaid) eventStr = "Payment Successful";
                else if (assessment) eventStr = "Assessment Started";

                // amount is in paise — convert for display
                const displayAmount = isPaid && payment?.amount != null
                  ? `₹${(payment.amount / 100).toFixed(0)}`
                  : "—";

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#1e3a5f]">{p.name}</td>
                    <td className="px-6 py-4 text-slate-600">{eventStr}</td>
                    <td className="px-6 py-4 text-slate-600">{displayAmount}</td>
                    <td className="px-6 py-4">
                      {isCompleted ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Completed</span>
                      ) : isPaid ? (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">Paid</span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">{date}</td>
                  </tr>
                );
              })}
              {recentActivity.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No recent activity.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
