import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/admin/metrics";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_24px_38px_rgba(15,23,42,0.07)]">
      <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-black tracking-[-0.04em] text-[#10233d]">
        {title}
      </h2>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-50 py-3 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="text-right text-sm font-bold text-[#10233d]">{value}</span>
    </div>
  );
}

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const p = await db.participant.findUnique({
    where: { id },
    include: {
      assessments: {
        include: {
          result: true,
          report: true,
        },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!p) notFound();

  const formatDate = (date: Date | null | undefined) =>
    date
      ? new Date(date).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const assessment = p.assessments?.[0];
  const payment = p.payments?.[0];
  const result = assessment?.result;
  const report = assessment?.report;

  const isPaid = payment?.status === "SUCCESS";
  const isCompleted = assessment?.status === "COMPLETED";

  // amount is in paise — convert to rupees at display boundary
  const displayAmount = isPaid && payment?.amount != null
    ? `₹${paiseToRupees(payment.amount).toFixed(0)}`
    : "—";

  // Timeline — only use timestamps that actually exist in the schema
  const timeline = [
    { label: "Assessment Started", date: assessment?.startedAt, done: !!assessment },
    { label: "Payment Successful", date: isPaid ? payment?.updatedAt : null, done: isPaid },
    { label: "Assessment Submitted", date: isCompleted ? assessment?.completedAt : null, done: isCompleted },
    { label: "Result Scored", date: result?.createdAt, done: !!result },
    { label: "Report Generated", date: report?.createdAt, done: !!report },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/participants" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-[#10233d]">
          &larr; Back
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-[-0.06em] text-[#10233d]">{p.name}</h1>
          <p className="text-sm font-medium text-slate-500">{p.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Participant Details">
            <DataRow label="Name" value={p.name} />
            <DataRow label="Email" value={p.email} />
            <DataRow label="Phone" value={p.phone || "—"} />
            <DataRow label="Registered At" value={formatDate(p.createdAt)} />
          </Section>

          <Section title="Payment Details">
            <DataRow
              label="Status"
              value={
                isPaid ? (
                  <span className="text-emerald-600 font-bold">SUCCESS</span>
                ) : payment?.status === "FAILED" ? (
                  <span className="text-red-600 font-bold">FAILED</span>
                ) : (
                  <span className="text-amber-600 font-bold">{payment?.status ?? "NONE"}</span>
                )
              }
            />
            <DataRow label="Amount" value={displayAmount} />
            <DataRow label="Payment Gateway" value="Razorpay" />
            <DataRow
              label="Payment Method"
              value={<span className="text-slate-400 italic text-xs">Not available</span>}
            />
            <DataRow
              label="Razorpay Order ID"
              value={<span className="font-mono text-xs">{payment?.razorpayOrderId || "—"}</span>}
            />
            <DataRow
              label="Razorpay Payment ID"
              value={<span className="font-mono text-xs">{payment?.razorpayPaymentId || "—"}</span>}
            />
            <DataRow label="Payment Created At" value={formatDate(payment?.createdAt)} />
          </Section>

          <Section title="Assessment Status">
            <DataRow
              label="Status"
              value={
                isCompleted ? (
                  <span className="text-emerald-600 font-bold">COMPLETED</span>
                ) : (
                  <span className="text-amber-600 font-bold">{assessment?.status ?? "NONE"}</span>
                )
              }
            />
            <DataRow label="Started At" value={formatDate(assessment?.startedAt)} />
            <DataRow
              label="Completed At"
              value={isCompleted ? formatDate(assessment?.completedAt) : "—"}
            />
          </Section>

          {result && (
            <Section title="Personality Result (OCEAN)">
              <DataRow label="Openness" value={`${result.openness.toFixed(1)}%`} />
              <DataRow label="Conscientiousness" value={`${result.conscientiousness.toFixed(1)}%`} />
              <DataRow label="Extraversion" value={`${result.extraversion.toFixed(1)}%`} />
              <DataRow label="Agreeableness" value={`${result.agreeableness.toFixed(1)}%`} />
              <DataRow label="Neuroticism" value={`${result.neuroticism.toFixed(1)}%`} />
            </Section>
          )}

          {report && (
            <Section title="Report">
              <DataRow label="Report Generated" value={<span className="text-emerald-600 font-bold">YES</span>} />
              <DataRow label="PDF Available" value={<span className="text-emerald-600 font-bold">YES</span>} />
              <DataRow
                label="Email Sent"
                value={<span className="text-slate-400 italic text-xs">Not tracked</span>}
              />
              <DataRow label="Generated At" value={formatDate(report.createdAt)} />
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/report/${report.id}`}
                  target="_blank"
                  className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-center text-xs font-bold uppercase tracking-[0.14em] text-[#10233d] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  View Online Report
                </Link>
                <a
                  href={`/api/report/${report.id}/pdf`}
                  download="report.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-full bg-[#10233d] px-6 py-3.5 text-center text-xs font-bold uppercase tracking-[0.14em] text-white shadow-[0_14px_28px_rgba(16,35,61,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0d1f35]"
                >
                  Download PDF
                </a>
              </div>
            </Section>
          )}
        </div>

        {/* Timeline Sidebar */}
        <div className="lg:col-span-1">
          <Section title="Event Timeline">
            <div className="space-y-6 pt-2">
              {timeline.map((item, i) => (
                <div key={i} className="flex gap-4 relative">
                  {i !== timeline.length - 1 && (
                    <div
                      className={`absolute top-6 bottom-[-24px] left-[11px] w-0.5 ${
                        item.done ? "bg-emerald-200" : "bg-slate-100"
                      }`}
                    />
                  )}
                  <div
                    className={`w-6 h-6 rounded-full flex shrink-0 items-center justify-center border-2 z-10 bg-white ${
                      item.done ? "border-emerald-500" : "border-slate-200"
                    }`}
                  >
                    {item.done && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                  </div>
                  <div className="pb-3">
                    <p className={`text-sm font-bold ${item.done ? "text-[#10233d]" : "text-slate-400"}`}>
                      {item.label}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {item.done && item.date ? formatDate(item.date) : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
