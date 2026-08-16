import { db } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-3 border-b border-slate-50 last:border-0">
      <span className="text-sm font-bold text-slate-500 uppercase">{label}</span>
      <span className="text-base font-semibold text-[#1e3a5f] text-right">{value}</span>
    </div>
  );
}

export default async function EvidencePage() {
  const [
    completedAssessments,
    successfulPayments,
    reportsGenerated,
  ] = await Promise.all([
    db.assessment.count({ where: { status: "COMPLETED" } }),
    db.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "SUCCESS" } }),
    db.report.count(),
  ]);

  const assessmentPrice = 99;
  const paymentCount = successfulPayments._count || 0;
  const totalRevenue = successfulPayments._sum.amount || 0;
  
  const formattedRevenue = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRevenue);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1e3a5f] mb-1">CA Evidence</h1>
          <p className="text-slate-500 text-sm">Academic record and project metrics for HRM301.</p>
        </div>
        <a
          href="/api/admin/evidence/export"
          className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#162c4a] transition-colors"
        >
          Export CSV
        </a>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100">Project Parameters</h2>
          <div className="space-y-1">
            <DataRow label="Assessment Model" value="Big Five (OCEAN)" />
            <DataRow label="Number of Questions" value="50 Questions" />
            <DataRow label="Assessment Price" value={`₹${assessmentPrice}`} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100">Live Execution Metrics</h2>
          <div className="space-y-1">
            <DataRow label="Completed Assessments" value={completedAssessments} />
            <DataRow label="Reports Generated" value={reportsGenerated} />
            <DataRow label="Successful Payments" value={paymentCount} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100">Revenue Calculation</h2>
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">Formula</span>
              <span className="font-mono text-sm text-[#1e3a5f]">{paymentCount} payments × ₹{assessmentPrice}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
              <span className="text-base font-bold text-[#1e3a5f] uppercase">Total Revenue</span>
              <span className="text-2xl font-black text-emerald-600">{formattedRevenue}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
