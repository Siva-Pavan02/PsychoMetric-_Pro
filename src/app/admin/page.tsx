import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
      <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-[#1e3a5f]">{value}</p>
    </div>
  );
}

export default async function AdminDashboard() {
  const [
    totalParticipants,
    completedAssessments,
    pendingAssessments,
    successfulPayments,
    failedPayments,
    recentActivity,
  ] = await Promise.all([
    db.participant.count(),
    db.assessment.count({ where: { status: "COMPLETED" } }),
    db.assessment.count({ where: { status: { not: "COMPLETED" } } }),
    db.payment.findMany({ where: { status: "SUCCESS" }, select: { amount: true } }),
    db.payment.count({ where: { status: { not: "SUCCESS" } } }),
    db.participant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        assessments: { select: { status: true }, orderBy: { startedAt: "desc" }, take: 1 },
        payments: { select: { status: true, amount: true, currency: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const formattedRevenue = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRevenue);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1e3a5f] mb-1">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm">Real-time metrics and recent activity.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Participants" value={totalParticipants} />
        <Stat label="Completed" value={completedAssessments} />
        <Stat label="Pending" value={pendingAssessments} />
        <Stat label="Payments" value={successfulPayments.length} />
        <Stat label="Failed" value={failedPayments} />
        <Stat label="Revenue" value={formattedRevenue} />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-[#1e3a5f]">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Participant</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4">Payment</th>
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
                const date = new Date(p.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                
                let eventStr = "Started";
                if (isCompleted) eventStr = "Assessment Completed";
                else if (isPaid) eventStr = "Payment Successful";
                else if (assessment) eventStr = "Assessment Started";
                
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#1e3a5f]">{p.name}</td>
                    <td className="px-6 py-4 text-slate-600">{eventStr}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {isPaid ? `₹${payment?.amount}` : "—"}
                    </td>
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
