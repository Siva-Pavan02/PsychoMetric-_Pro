import { notFound } from "next/navigation";
import { db } from "@/lib/db";

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

export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Server-side slug validation
  const adminSlug = process.env.ADMIN_SLUG;
  if (!adminSlug || slug !== adminSlug) notFound();

  const [participants, completedAssessments, payments, allAssessments] =
    await Promise.all([
      db.participant.count(),
      db.assessment.count({ where: { status: "COMPLETED" } }),
      db.payment.findMany({
        where:   { status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        select:  {
          id: true, amount: true, currency: true, createdAt: true, razorpayPaymentId: true,
          participant: { select: { name: true, email: true } },
          assessment:  { select: { status: true } },
        },
      }),
      db.assessment.count(),
    ]);

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0) / 100;
  const completionRate = allAssessments > 0 ? Math.round((completedAssessments / allAssessments) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1e3a5f] text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Internal</p>
          <h1 className="text-2xl font-bold">Revenue & Assessment Evidence</h1>
          <p className="text-blue-200 text-sm mt-1">PsychoMetric Pro · HRM301</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Total Participants"     value={participants} />
          <Stat label="Completed Assessments"  value={completedAssessments} />
          <Stat label="Successful Payments"    value={payments.length} />
          <Stat label="Total Revenue"          value={`₹${totalRevenue.toFixed(2)}`} sub={`Completion rate: ${completionRate}%`} />
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[#1e3a5f]">Recent Transactions</h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="text-left px-6 py-3">Participant</th>
                    <th className="text-left px-6 py-3">Email</th>
                    <th className="text-left px-6 py-3">Payment ID</th>
                    <th className="text-right px-6 py-3">Amount</th>
                    <th className="text-left px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{p.participant.name}</td>
                      <td className="px-6 py-3 text-slate-500">{p.participant.email}</td>
                      <td className="px-6 py-3 text-slate-400 font-mono text-xs">{p.razorpayPaymentId?.slice(0, 16)}…</td>
                      <td className="px-6 py-3 text-right font-semibold text-[#1e3a5f]">₹{p.amount / 100}</td>
                      <td className="px-6 py-3 text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center pb-4">
          This page is for internal demonstration purposes only. Access is restricted by a secret URL.
        </p>
      </main>
    </div>
  );
}
