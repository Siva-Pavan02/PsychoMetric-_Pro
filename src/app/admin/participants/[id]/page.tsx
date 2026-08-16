import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ReportData } from "@/types";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-sm font-bold text-[#1e3a5f] mb-4 pb-2 border-b border-slate-100 uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
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
        take: 1
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
    },
  });

  if (!p) notFound();

  const formatDate = (date: Date | null | undefined) =>
    date ? new Date(date).toLocaleString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const assessment = p.assessments?.[0];
  const payment = p.payments?.[0];
  const result = assessment?.result;
  const report = assessment?.report;

  const scores = result ? (result as unknown as any) : null;
  const isPaid = payment?.status === "SUCCESS";
  const isCompleted = assessment?.status === "COMPLETED";

  // Timeline
  const timeline = [
    { label: "Assessment Started", date: assessment?.startedAt, done: !!assessment },
    { label: "Payment Successful", date: isPaid ? payment?.updatedAt : null, done: isPaid },
    { label: "Assessment Submitted", date: isCompleted ? assessment?.completedAt : null, done: isCompleted },
    { label: "Result Scored", date: result?.createdAt, done: !!result },
    { label: "Report Generated", date: report?.createdAt, done: !!report },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/participants" className="text-slate-400 hover:text-[#1e3a5f] transition-colors">
          &larr; Back
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1e3a5f]">{p.name}</h1>
          <p className="text-slate-500 text-sm">{p.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Participant Details">
            <DataRow label="ID" value={<span className="font-mono text-xs">{p.id}</span>} />
            <DataRow label="Name" value={p.name} />
            <DataRow label="Email" value={p.email} />
            <DataRow label="Phone" value={p.phone || "—"} />
            <DataRow label="Created At" value={formatDate(p.createdAt)} />
          </Section>

          <Section title="Payment Details">
            <DataRow label="Status" value={
              isPaid ? <span className="text-emerald-600 font-bold">SUCCESS</span> : <span className="text-amber-600 font-bold">{payment?.status || "PENDING"}</span>
            } />
            <DataRow label="Amount" value={isPaid ? `₹${payment?.amount}` : "—"} />
            <DataRow label="Razorpay Order ID" value={<span className="font-mono text-xs">{payment?.razorpayOrderId || "—"}</span>} />
            <DataRow label="Razorpay Payment ID" value={<span className="font-mono text-xs">{payment?.razorpayPaymentId || "—"}</span>} />
            <DataRow label="Payment Date" value={formatDate(payment?.createdAt)} />
          </Section>

          <Section title="Assessment Status">
            <DataRow label="Assessment ID" value={<span className="font-mono text-xs">{assessment?.id || "—"}</span>} />
            <DataRow label="Status" value={
              isCompleted ? <span className="text-emerald-600 font-bold">COMPLETED</span> : <span className="text-amber-600 font-bold">{assessment?.status || "PENDING"}</span>
            } />
            <DataRow label="Questions Completed" value={isCompleted ? "50/50" : "—"} />
            <DataRow label="Started At" value={formatDate(assessment?.startedAt)} />
            <DataRow label="Completed At" value={isCompleted ? formatDate(assessment?.completedAt) : "—"} />
          </Section>
          
          {scores && (
            <Section title="Personality Result (OCEAN)">
              <DataRow label="Openness" value={`${scores.openness}%`} />
              <DataRow label="Conscientiousness" value={`${scores.conscientiousness}%`} />
              <DataRow label="Extraversion" value={`${scores.extraversion}%`} />
              <DataRow label="Agreeableness" value={`${scores.agreeableness}%`} />
              <DataRow label="Neuroticism" value={`${scores.neuroticism}%`} />
            </Section>
          )}

          {report && (
            <Section title="Report Management">
              <DataRow label="Report Generated" value={formatDate(report.createdAt)} />
              <div className="flex gap-4 mt-6">
                <Link href={`/report/${report.id}`} target="_blank" className="flex-1 bg-white border border-[#1e3a5f] text-[#1e3a5f] text-center font-bold py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  View Online Report
                </Link>
                <Link href={`/api/report/${report.id}/pdf`} className="flex-1 bg-[#1e3a5f] text-white text-center font-bold py-2.5 rounded-lg hover:bg-[#162c4a] transition-colors">
                  Download PDF
                </Link>
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
                    <div className={`absolute top-6 bottom-[-24px] left-[11px] w-0.5 ${item.done ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                  )}
                  <div className={`w-6 h-6 rounded-full flex shrink-0 items-center justify-center border-2 z-10 bg-white ${item.done ? 'border-emerald-500' : 'border-slate-200'}`}>
                    {item.done && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                  </div>
                  <div className="pb-2">
                    <p className={`text-sm font-bold ${item.done ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</p>
                    <p className="text-xs text-slate-500">{item.done && item.date ? formatDate(item.date) : "Pending"}</p>
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
