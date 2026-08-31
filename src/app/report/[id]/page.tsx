import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ReportData, LegacyReportData, TraitScores, TraitLevel } from "@/types";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Reports are reachable by opaque ID alone — keep them out of search indexes,
// and stop crawlers following through to the PDF route.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/* ── Brand-palette trait colors ── */
const TRAIT_COLORS: Record<string, string> = {
  Openness:          "bg-[#2b7a78]",
  Conscientiousness: "bg-[#1d4f7a]",
  Extraversion:      "bg-[#10233d]",
  Agreeableness:     "bg-[#3d8b8a]",
  Neuroticism:       "bg-[#5b6c83]",
};

function TraitBar({ label, score }: { label: string; score: number }) {
  const color = TRAIT_COLORS[label] ?? "bg-slate-500";
  const level = score < 40 ? "Low" : score < 70 ? "Moderate" : "High";
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#10233d]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#edf3f8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{level}</span>
          <span className="text-sm font-black tabular-nums text-[#10233d]">{score}%</span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#edf3f8]">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${score}%`}
        />
      </div>
    </div>
  );
}

/* ── Card wrappers with hierarchy levels ── */
function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-[0_10px_25px_rgba(15,23,42,0.06)] sm:p-8 ${className}`}>
      <h2 className="mb-5 border-b border-slate-200/80 pb-3 text-base font-black tracking-[-0.03em] text-[#10233d]">{title}</h2>
      {children}
    </section>
  );
}

function LightCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200/60 bg-[#f8fafc] p-5 sm:p-6 ${className}`}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2b7a78]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm text-slate-700">
      <span className="font-semibold text-slate-500">{label}: </span>
      {children}
    </div>
  );
}

function normalizeReport(data: any): ReportData {
  if (data.methodology) return data as ReportData;
  
  // Minimal fallback for legacy reports
  const leg = data as LegacyReportData;
  return {
    participantName: leg.participantName,
    assessmentId: leg.assessmentId,
    assessmentDate: leg.assessmentDate,
    methodology: {
      model: "Big Five / OCEAN", items: 50, itemsPerTrait: 10, scale: "1-5 Likert Scale", type: "Self-report", scoring: "Deterministic aggregation", limitations: []
    },
    responseQuality: { flags: [], valid: true },
    scores: leg.scores,
    profile: leg.profile,
    scoreLegend: { low: "0-39", moderate: "40-69", high: "70-100" },
    profileAtGlance: { balancedDimensions: [], developmentFocus: [] },
    traitRanking: [
      { trait: "Openness", score: leg.scores.openness },
      { trait: "Conscientiousness", score: leg.scores.conscientiousness },
      { trait: "Extraversion", score: leg.scores.extraversion },
      { trait: "Agreeableness", score: leg.scores.agreeableness },
      { trait: "Neuroticism", score: leg.scores.neuroticism }
    ].sort((a, b) => b.score - a.score),
    personalityTypeSummary: leg.personalityTypeSummary,
    overallProfile: leg.overallProfile,
    traitInsights: {
      openness: { score: leg.scores.openness, level: leg.profile.openness.level, meaning: leg.opennessDescription || "", implication: "" },
      conscientiousness: { score: leg.scores.conscientiousness, level: leg.profile.conscientiousness.level, meaning: leg.conscientiousnessDescription || "", implication: "" },
      extraversion: { score: leg.scores.extraversion, level: leg.profile.extraversion.level, meaning: leg.extraversionDescription || "", implication: "" },
      agreeableness: { score: leg.scores.agreeableness, level: leg.profile.agreeableness.level, meaning: leg.agreeablenessDescription || "", implication: "" },
      neuroticism: { score: leg.scores.neuroticism, level: leg.profile.neuroticism.level, meaning: leg.neuroticismDescription || "", implication: "" }
    },
    strengths: (leg.majorStrengths || []).map(s => ({ strength: s, drivenBy: "Profile", tradeOff: "" })),
    leadership: { style: leg.leadershipPotential, strengths: "", teamContribution: "", development: "", drivenByScores: "" },
    communication: { preferredStyle: leg.communicationStyle, teamTendency: "", strength: "", blindSpot: "", drivenByScores: "" },
    decisionMaking: { structuredVsExploratory: leg.decisionMakingStyle, speedVsDeliberation: "", peopleConsiderations: "", underUncertainty: "", drivenByScores: "" },
    careerSuitability: { overview: (leg.careerSuitability || []).join(", "), whyFit: "", roles: leg.careerSuitability || [], caveat: "", drivenByScores: "" },
    learningStyle: { preferredStructure: leg.learningStyle, pace: "", feedback: "", practicalVsExploratory: "", independentVsCollaborative: "" },
    stressCoping: { sensitivity: "", likelyChallenge: leg.stressAndCoping, helpfulStrategies: "" },
    motivationalDrivers: leg.motivationalDrivers || [],
    developmentAreas: (leg.developmentAreas || []).map(d => ({ area: d, whyItMatters: "", practicalGrowth: "" })),
    actionPlan: (leg.recommendations || []).map(r => ({ action: r, why: "" })),
    summary: leg.summary,
    disclaimer: leg.disclaimer
  };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const report = await db.report.findUnique({
    where: { id },
    select: { content: true, createdAt: true },
  });

  if (!report) notFound();

  const data = normalizeReport(report.content);
  const date = new Date(data.assessmentDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(29,79,122,0.07),_transparent_30%),linear-gradient(180deg,#edf3f8_0%,#f8fafc_100%)]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#10233d] text-sm font-black text-white">P</span>
            <span className="text-base font-black tracking-[-0.05em] text-[#10233d]">PsychoMetric Pro</span>
          </div>
          <a
            href={`/api/report/${id}/pdf`}
            className="inline-flex items-center gap-2 rounded-full bg-[#10233d] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(16,35,61,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0d1f35]"
            download="psychometric-report.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↓ Download PDF
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ═══ HERO ═══ */}
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 shadow-[0_28px_42px_rgba(15,23,42,0.08)]">
          {/* Navy banner */}
          <div className="bg-[linear-gradient(135deg,#0d1f35,#1d4f7a_60%,#2b7a78)] px-6 py-8 text-white sm:px-10 sm:py-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200/80">Personality Assessment Report</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.06em] sm:text-4xl">{data.participantName}</h1>
            <p className="mt-2 text-sm font-medium text-sky-100/70">{date} · ID {data.assessmentId.slice(0, 8).toUpperCase()}</p>
          </div>

          {/* Profile summary + at-a-glance */}
          <div className="px-6 py-6 sm:px-10 sm:py-8">
            <p className="text-sm leading-7 text-slate-700">{data.personalityTypeSummary}</p>

            {/* Strengths badges */}
            {(data.profileAtGlance.primaryStrength || data.profileAtGlance.secondaryStrength) && (
              <div className="mt-5 flex flex-wrap gap-3">
                {data.profileAtGlance.primaryStrength && (
                  <div className="rounded-2xl border border-[#2b7a78]/20 bg-[#e8f4f3] px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b7a78]">Primary Strength</p>
                    <p className="mt-0.5 text-sm font-black text-[#10233d]">{data.profileAtGlance.primaryStrength.trait} — {data.profileAtGlance.primaryStrength.score}%</p>
                  </div>
                )}
                {data.profileAtGlance.secondaryStrength && (
                  <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Secondary Strength</p>
                    <p className="mt-0.5 text-sm font-black text-[#10233d]">{data.profileAtGlance.secondaryStrength.trait} — {data.profileAtGlance.secondaryStrength.score}%</p>
                  </div>
                )}
              </div>
            )}

            {data.profileAtGlance.balancedDimensions.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Balanced Dimensions</p>
                <p className="mt-1 text-sm text-slate-600">{data.profileAtGlance.balancedDimensions.map(t => `${t.trait} (${t.score}%)`).join(", ")}</p>
              </div>
            )}
            {data.profileAtGlance.developmentFocus.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Development Focus</p>
                <p className="mt-1 text-sm text-slate-600">{data.profileAtGlance.developmentFocus.map(t => `${t.trait} (${t.score}%)`).join(", ")}</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══ OCEAN SCORES ═══ */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card title="Personality Trait Scores" className="md:col-span-2">
            <TraitBar label="Openness"          score={data.scores.openness}          />
            <TraitBar label="Conscientiousness"  score={data.scores.conscientiousness}  />
            <TraitBar label="Extraversion"       score={data.scores.extraversion}       />
            <TraitBar label="Agreeableness"      score={data.scores.agreeableness}      />
            <TraitBar label="Neuroticism"        score={data.scores.neuroticism}        />
          </Card>

          <div className="flex flex-col gap-6">
            <LightCard title="Score Key">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Low</span><span className="font-medium text-slate-700">{data.scoreLegend.low}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Moderate</span><span className="font-medium text-slate-700">{data.scoreLegend.moderate}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">High</span><span className="font-medium text-slate-700">{data.scoreLegend.high}</span></div>
              </div>
            </LightCard>

            <LightCard title="Trait Ranking">
              <ol className="space-y-1.5 text-sm text-slate-700">
                {data.traitRanking.map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#edf3f8] text-[10px] font-black text-[#1d4f7a]">{i + 1}</span>
                    <span className="font-medium">{t.trait}</span>
                    <span className="ml-auto tabular-nums text-slate-400">{t.score}%</span>
                  </li>
                ))}
              </ol>
            </LightCard>
          </div>
        </div>

        {/* ═══ OVERALL PROFILE ═══ */}
        <Card title="Overall Personality Profile" className="mb-6">
          <p className="text-sm leading-7 text-slate-700">{data.overallProfile}</p>
        </Card>

        {/* ═══ TRAIT INSIGHTS ═══ */}
        <Card title="Trait-Level Insights" className="mb-6">
          <div className="space-y-4">
            {[
              { trait: "Openness", d: data.traitInsights.openness },
              { trait: "Conscientiousness", d: data.traitInsights.conscientiousness },
              { trait: "Extraversion", d: data.traitInsights.extraversion },
              { trait: "Agreeableness", d: data.traitInsights.agreeableness },
              { trait: "Neuroticism", d: data.traitInsights.neuroticism },
            ].map(({ trait, d }) => (
              <div key={trait} className="rounded-xl border border-slate-200/60 bg-[#f8fafc] p-4 sm:p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-[#10233d]">{trait}</h3>
                  <span className="rounded-full bg-[#edf3f8] px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-[#1d4f7a]">
                    {d.score}% · {d.level}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{d.meaning}</p>
                {d.implication && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-500">Implication: </span>{d.implication}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* ═══ BEHAVIOURAL PROFILE — 2-col grid ═══ */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Major Strengths">
            <div className="space-y-4">
              {data.strengths.map((s, i) => (
                <div key={i} className="text-sm">
                  <p className="font-semibold text-[#10233d]">{s.strength}</p>
                  {s.drivenBy && <p className="mt-0.5 text-xs text-slate-500">Driven by: {s.drivenBy}</p>}
                  {s.tradeOff && <p className="mt-0.5 text-xs italic text-slate-400">Trade-off: {s.tradeOff}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Leadership Potential">
            <div className="space-y-2 text-sm text-slate-700">
              <KeyValue label="Style">{data.leadership.style}</KeyValue>
              {data.leadership.strengths && <KeyValue label="Strengths">{data.leadership.strengths}</KeyValue>}
              {data.leadership.teamContribution && <KeyValue label="Team Contribution">{data.leadership.teamContribution}</KeyValue>}
              {data.leadership.development && <KeyValue label="Development">{data.leadership.development}</KeyValue>}
            </div>
          </Card>

          <Card title="Communication Style">
            <div className="space-y-2 text-sm text-slate-700">
              <KeyValue label="Preferred Style">{data.communication.preferredStyle}</KeyValue>
              {data.communication.teamTendency && <KeyValue label="Team Tendency">{data.communication.teamTendency}</KeyValue>}
              {data.communication.strength && <KeyValue label="Strength">{data.communication.strength}</KeyValue>}
              {data.communication.blindSpot && <KeyValue label="Blind Spot">{data.communication.blindSpot}</KeyValue>}
            </div>
          </Card>

          <Card title="Decision-Making Style">
            <div className="space-y-2 text-sm text-slate-700">
              <KeyValue label="Approach">{data.decisionMaking.structuredVsExploratory}</KeyValue>
              {data.decisionMaking.speedVsDeliberation && <KeyValue label="Pace">{data.decisionMaking.speedVsDeliberation}</KeyValue>}
              {data.decisionMaking.peopleConsiderations && <KeyValue label="People">{data.decisionMaking.peopleConsiderations}</KeyValue>}
              {data.decisionMaking.underUncertainty && <KeyValue label="Under Uncertainty">{data.decisionMaking.underUncertainty}</KeyValue>}
            </div>
          </Card>

          <Card title="Learning Style">
            <div className="space-y-2 text-sm text-slate-700">
              <KeyValue label="Structure">{data.learningStyle.preferredStructure}</KeyValue>
              {data.learningStyle.pace && <KeyValue label="Pace">{data.learningStyle.pace}</KeyValue>}
              {data.learningStyle.feedback && <KeyValue label="Feedback">{data.learningStyle.feedback}</KeyValue>}
              {data.learningStyle.independentVsCollaborative && <KeyValue label="Format">{data.learningStyle.independentVsCollaborative}</KeyValue>}
            </div>
          </Card>

          <Card title="Stress & Coping">
            <div className="space-y-2 text-sm text-slate-700">
              <KeyValue label="Sensitivity">{data.stressCoping.sensitivity || "Moderate"}</KeyValue>
              {data.stressCoping.likelyChallenge && <KeyValue label="Challenge">{data.stressCoping.likelyChallenge}</KeyValue>}
              {data.stressCoping.helpfulStrategies && <KeyValue label="Strategies">{data.stressCoping.helpfulStrategies}</KeyValue>}
            </div>
          </Card>
        </div>

        {/* ═══ CAREER ═══ */}
        <Card title="Career Suitability" className="mb-6">
          <div className="space-y-3 text-sm text-slate-700">
            <KeyValue label="Environments">{data.careerSuitability.overview}</KeyValue>
            {data.careerSuitability.whyFit && <KeyValue label="Why It Fits">{data.careerSuitability.whyFit}</KeyValue>}

            <div className="pt-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Compatible Roles</p>
              <div className="flex flex-wrap gap-2">
                {data.careerSuitability.roles.map((c, i) => (
                  <span key={i} className="rounded-full border border-slate-200 bg-[#edf3f8] px-3.5 py-1.5 text-xs font-bold text-[#10233d]">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {data.careerSuitability.caveat && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs italic text-slate-400">{data.careerSuitability.caveat}</p>
            )}
          </div>
        </Card>

        {/* ═══ MOTIVATIONAL DRIVERS ═══ */}
        <Card title="Motivational Drivers" className="mb-6">
          <BulletList items={data.motivationalDrivers} />
        </Card>

        {/* ═══ DEVELOPMENT AREAS ═══ */}
        <Card title="Development Areas" className="mb-6">
          <div className="space-y-4">
            {data.developmentAreas.map((dev, i) => (
              <div key={i} className="text-sm text-slate-700">
                <p className="font-semibold text-[#10233d]">{dev.area}</p>
                {dev.whyItMatters && <p className="mt-1"><span className="font-medium text-slate-500">Why it matters: </span>{dev.whyItMatters}</p>}
                {dev.practicalGrowth && <p className="mt-1"><span className="font-medium text-slate-500">Growth direction: </span>{dev.practicalGrowth}</p>}
              </div>
            ))}
          </div>
        </Card>

        {/* ═══ ACTION PLAN ═══ */}
        <Card title="Personalised Action Plan" className="mb-6">
          <div className="space-y-5">
            {data.actionPlan.map((rec, i) => (
              <div key={i} className="flex gap-4 text-sm text-slate-700">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf3f8] text-xs font-black text-[#1d4f7a]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-bold text-[#10233d]">{rec.action}</p>
                  {rec.why && <p className="mt-1 leading-relaxed text-slate-600">{rec.why}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ═══ SUMMARY ═══ */}
        <Card title="Summary" className="mb-6">
          <p className="text-sm font-medium leading-7 text-slate-700">{data.summary}</p>
        </Card>

        {/* ═══ METHODOLOGY ═══ */}
        <LightCard title="Assessment Methodology" className="mb-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <div><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Model</span><span className="text-slate-700">{data.methodology.model}</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Items</span><span className="text-slate-700">{data.methodology.items}</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Per Trait</span><span className="text-slate-700">{data.methodology.itemsPerTrait}</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Scale</span><span className="text-slate-700">{data.methodology.scale}</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Type</span><span className="text-slate-700">{data.methodology.type}</span></div>
            <div><span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Scoring</span><span className="text-slate-700">{data.methodology.scoring}</span></div>
          </div>
        </LightCard>

        {/* ═══ PDF CTA ═══ */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-8 text-center shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-black tracking-[-0.04em] text-[#10233d]">Save your report</p>
          <p className="mt-1 text-sm text-slate-500">Download a PDF copy for your records.</p>
          <a
            href={`/api/report/${id}/pdf`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#10233d] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(16,35,61,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0d1f35]"
            download="psychometric-report.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↓ Download PDF Report
          </a>
        </div>

        {/* ═══ DISCLAIMER ═══ */}
        <p className="px-4 pb-8 text-center text-xs leading-relaxed text-slate-400">
          {data.disclaimer}
        </p>
      </main>
    </div>
  );
}

