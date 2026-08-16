import { getAdminMetrics, getResetPreviewCounts } from "@/lib/admin/metrics";
import ResetPanel from "./ResetPanel";

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
  const [m, counts] = await Promise.all([getAdminMetrics(), getResetPreviewCounts()]);

  const refreshedAt = m.calculatedAt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const resetEnabled = process.env.ALLOW_DATA_RESET === "true";

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1e3a5f] mb-1">CA Evidence</h1>
          <p className="text-slate-500 text-sm">Academic record and project metrics for HRM301.</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400 tabular-nums hidden sm:block">
            Refreshed: {refreshedAt}
          </p>
          <a
            href="/api/admin/evidence/export"
            className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#162c4a] transition-colors"
          >
            Export CSV
          </a>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100">
            Project Parameters
          </h2>
          <div className="space-y-1">
            <DataRow label="Assessment Model" value="Big Five (OCEAN)" />
            <DataRow label="Number of Questions" value="50 Questions" />
            <DataRow label="Assessment Price" value="₹99" />
            <DataRow label="Payment Gateway" value="Razorpay" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100">
            Live Execution Metrics
          </h2>
          <div className="space-y-1">
            <DataRow label="Total Participants" value={m.totalParticipants} />
            <DataRow label="Completed Assessments" value={m.completedAssessments} />
            <DataRow label="Successful Payments" value={m.successfulPaymentCount} />
            <DataRow label="Failed Payments" value={m.failedPaymentCount} />
            <DataRow label="Reports Generated" value={m.reportsGenerated} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100">
            Revenue — Actual DB Values
          </h2>
          <div className="bg-slate-50 rounded-lg p-5 border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Calculation</span>
              <span className="font-mono text-sm text-[#1e3a5f]">
                SUM(successful Payment.amount) ÷ 100
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Successful Payments</span>
              <span className="font-bold text-[#1e3a5f]">{m.successfulPaymentCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Avg per Payment</span>
              <span className="font-bold text-[#1e3a5f]">
                {m.successfulPaymentCount > 0
                  ? `₹${m.avgSuccessfulPaymentRupees.toFixed(0)}`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-base font-bold text-[#1e3a5f] uppercase">Total Revenue</span>
              <span className="text-2xl font-black text-emerald-600">{m.totalRevenueFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Test Data Section */}
      <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-red-700 mb-1">Reset Test Data</h2>
        <p className="text-sm text-slate-500 mb-6">
          Permanently deletes all participant, assessment, response, payment, result, and report
          records. Database schema and migration history are preserved. This action cannot be undone.
        </p>
        <ResetPanel counts={counts} resetEnabled={resetEnabled} />
      </div>
    </div>
  );
}
