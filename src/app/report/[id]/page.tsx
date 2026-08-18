import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ReportData, LegacyReportData, TraitScores, TraitLevel } from "@/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TRAIT_COLORS: Record<string, string> = {
  Openness:          "bg-violet-500",
  Conscientiousness: "bg-blue-500",
  Extraversion:      "bg-amber-500",
  Agreeableness:     "bg-emerald-500",
  Neuroticism:       "bg-rose-500",
};

function TraitBar({ label, score }: { label: string; score: number }) {
  const color = TRAIT_COLORS[label] ?? "bg-slate-500";
  const level = score < 40 ? "Low" : score < 70 ? "Moderate" : "High";
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold">{level}</span>
          <span className="text-sm font-black text-[#1e3a5f]">{score}%</span>
        </div>
      </div>
      <div className="h-3 bg-neu-bg shadow-neu-pressed rounded-full overflow-hidden p-[1px]">
        <div
          className={`h-full ${color} rounded-full transition-all`}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-neu-bg rounded-3xl p-8 shadow-neu-flat border-4 border-neu-bg">
      <h2 className="text-lg font-bold text-[#1e3a5f] mb-4 pb-3 border-b-2 border-slate-200/50">{title}</h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
          <span className="text-[#1e3a5f] font-bold mt-0.5 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
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
    <div className="min-h-screen bg-neu-bg">
      {/* Header */}
      <header className="bg-neu-bg shadow-neu-sm border-b-4 border-neu-bg sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">PsychoMetric Pro</p>
              <h1 className="text-2xl font-bold text-[#1e3a5f]">Personality Assessment Report</h1>
              <p className="text-slate-500 text-sm mt-1">{data.participantName} · {date}</p>
            </div>
            <a
              href={`/api/report/${id}/pdf`}
              className="shrink-0 bg-neu-bg shadow-neu-flat hover:shadow-neu-pressed text-[#1e3a5f] font-bold px-6 py-3 rounded-xl transition-all text-sm"
              download
            >
              ⬇ Download PDF
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        
        {/* Row 1: Participant Info & Profile at a Glance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-neu-bg rounded-3xl p-8 shadow-neu-flat border-4 border-neu-bg flex flex-col justify-center space-y-6">
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Name</p><p className="font-bold text-[#1e3a5f] text-lg">{data.participantName}</p></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Date</p><p className="font-bold text-[#1e3a5f]">{date}</p></div>
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Assessment ID</p><p className="font-bold text-slate-600 font-mono text-sm">{data.assessmentId.slice(0, 8).toUpperCase()}</p></div>
          </div>
          
          <Section title="Profile at a Glance">
            {data.profileAtGlance.primaryStrength && (
              <div className="mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Primary Strength</span>
                <p className="text-sm font-semibold text-[#1e3a5f]">{data.profileAtGlance.primaryStrength.trait} ({data.profileAtGlance.primaryStrength.score}%)</p>
              </div>
            )}
            {data.profileAtGlance.secondaryStrength && (
              <div className="mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Secondary Strength</span>
                <p className="text-sm font-semibold text-[#1e3a5f]">{data.profileAtGlance.secondaryStrength.trait} ({data.profileAtGlance.secondaryStrength.score}%)</p>
              </div>
            )}
            {data.profileAtGlance.balancedDimensions.length > 0 && (
              <div className="mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Balanced Dimensions</span>
                <p className="text-sm text-slate-700">{data.profileAtGlance.balancedDimensions.map(t => `${t.trait} (${t.score}%)`).join(", ")}</p>
              </div>
            )}
            {data.profileAtGlance.developmentFocus.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Development Focus</span>
                <p className="text-sm text-slate-700">{data.profileAtGlance.developmentFocus.map(t => `${t.trait} (${t.score}%)`).join(", ")}</p>
              </div>
            )}
            {!data.profileAtGlance.primaryStrength && data.profileAtGlance.balancedDimensions.length === 0 && (
              <p className="text-sm text-slate-500 italic">See trait scores below for profile details.</p>
            )}
          </Section>
        </div>

        {/* OCEAN Scores & Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <Section title="Personality Trait Scores">
              <TraitBar label="Openness"          score={data.scores.openness}          />
              <TraitBar label="Conscientiousness"  score={data.scores.conscientiousness}  />
              <TraitBar label="Extraversion"       score={data.scores.extraversion}       />
              <TraitBar label="Agreeableness"      score={data.scores.agreeableness}      />
              <TraitBar label="Neuroticism"        score={data.scores.neuroticism}        />
            </Section>
          </div>
          
          <div className="flex flex-col gap-5">
            <Section title="Score Interpretation">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Low</span><span className="font-medium text-slate-700">{data.scoreLegend.low}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Moderate</span><span className="font-medium text-slate-700">{data.scoreLegend.moderate}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">High</span><span className="font-medium text-slate-700">{data.scoreLegend.high}</span></div>
              </div>
            </Section>
            
            <Section title="Trait Ranking">
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700">
                {data.traitRanking.map((t, i) => (
                  <li key={i}>
                    <span className="font-medium">{t.trait}</span> <span className="text-slate-400">— {t.score}%</span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        </div>

        <Section title="Personality Type Summary">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">{data.personalityTypeSummary}</p>
        </Section>

        <Section title="Overall Personality Profile">
          <p className="text-sm text-slate-700 leading-relaxed">{data.overallProfile}</p>
        </Section>

        {/* Methodology */}
        <Section title="Assessment Methodology">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 text-sm">
            <div><span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Model</span><span className="text-slate-700">{data.methodology.model}</span></div>
            <div><span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Total Items</span><span className="text-slate-700">{data.methodology.items}</span></div>
            <div><span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Items per Trait</span><span className="text-slate-700">{data.methodology.itemsPerTrait}</span></div>
            <div><span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Response Scale</span><span className="text-slate-700">{data.methodology.scale}</span></div>
            <div><span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Assessment Type</span><span className="text-slate-700">{data.methodology.type}</span></div>
            <div><span className="block text-xs font-bold text-slate-400 uppercase mb-0.5">Scoring</span><span className="text-slate-700">{data.methodology.scoring}</span></div>
          </div>
        </Section>

        {/* Trait Insights */}
        <Section title="Trait-Level Insights">
          <div className="space-y-5">
            {[
              { trait: "Openness", d: data.traitInsights.openness },
              { trait: "Conscientiousness", d: data.traitInsights.conscientiousness },
              { trait: "Extraversion", d: data.traitInsights.extraversion },
              { trait: "Agreeableness", d: data.traitInsights.agreeableness },
              { trait: "Neuroticism", d: data.traitInsights.neuroticism },
            ].map(({ trait, d }) => (
              <div key={trait} className="bg-neu-bg shadow-neu-pressed rounded-2xl p-5 border-none">
                <p className="text-sm font-black text-[#1e3a5f] tracking-wide mb-2">{trait} — {d.score}% ({d.level})</p>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  <p><span className="font-bold text-slate-500">Meaning: </span>{d.meaning}</p>
                  {d.implication && <p><span className="font-bold text-slate-500">Practical Implication: </span>{d.implication}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Two-column structural grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Section title="Major Strengths">
            <div className="space-y-3">
              {data.strengths.map((s, i) => (
                <div key={i} className="text-sm">
                  <p className="font-semibold text-[#1e3a5f]">{s.strength}</p>
                  {s.drivenBy && <p className="text-xs text-slate-500 mt-0.5">Driven by: {s.drivenBy}</p>}
                </div>
              ))}
            </div>
          </Section>
          
          <Section title="Leadership Potential">
            <div className="text-sm text-slate-700 space-y-2">
              <p><span className="font-semibold text-slate-500">Style: </span>{data.leadership.style}</p>
              {data.leadership.strengths && <p><span className="font-semibold text-slate-500">Strengths: </span>{data.leadership.strengths}</p>}
              {data.leadership.teamContribution && <p><span className="font-semibold text-slate-500">Team Contribution: </span>{data.leadership.teamContribution}</p>}
              {data.leadership.development && <p><span className="font-semibold text-slate-500">Development Opportunity: </span>{data.leadership.development}</p>}
            </div>
          </Section>

          <Section title="Communication Style">
            <div className="text-sm text-slate-700 space-y-2">
              <p><span className="font-semibold text-slate-500">Preferred Style: </span>{data.communication.preferredStyle}</p>
              {data.communication.teamTendency && <p><span className="font-semibold text-slate-500">Team Tendency: </span>{data.communication.teamTendency}</p>}
              {data.communication.strength && <p><span className="font-semibold text-slate-500">Potential Strength: </span>{data.communication.strength}</p>}
              {data.communication.blindSpot && <p><span className="font-semibold text-slate-500">Potential Blind Spot: </span>{data.communication.blindSpot}</p>}
            </div>
          </Section>
          
          <Section title="Decision-Making Style">
            <div className="text-sm text-slate-700 space-y-2">
              <p><span className="font-semibold text-slate-500">Approach: </span>{data.decisionMaking.structuredVsExploratory}</p>
              {data.decisionMaking.speedVsDeliberation && <p><span className="font-semibold text-slate-500">Pace: </span>{data.decisionMaking.speedVsDeliberation}</p>}
              {data.decisionMaking.peopleConsiderations && <p><span className="font-semibold text-slate-500">People Considerations: </span>{data.decisionMaking.peopleConsiderations}</p>}
              {data.decisionMaking.underUncertainty && <p><span className="font-semibold text-slate-500">Under Uncertainty: </span>{data.decisionMaking.underUncertainty}</p>}
            </div>
          </Section>

          <Section title="Learning Style">
            <div className="text-sm text-slate-700 space-y-2">
              <p><span className="font-semibold text-slate-500">Preferred Structure: </span>{data.learningStyle.preferredStructure}</p>
              {data.learningStyle.pace && <p><span className="font-semibold text-slate-500">Pace: </span>{data.learningStyle.pace}</p>}
              {data.learningStyle.feedback && <p><span className="font-semibold text-slate-500">Feedback: </span>{data.learningStyle.feedback}</p>}
              {data.learningStyle.independentVsCollaborative && <p><span className="font-semibold text-slate-500">Format: </span>{data.learningStyle.independentVsCollaborative}</p>}
            </div>
          </Section>

          <Section title="Stress & Coping Tendencies">
            <div className="text-sm text-slate-700 space-y-2">
              <p><span className="font-semibold text-slate-500">Stress Sensitivity: </span>{data.stressCoping.sensitivity || "Moderate"}</p>
              {data.stressCoping.likelyChallenge && <p><span className="font-semibold text-slate-500">Likely Challenge: </span>{data.stressCoping.likelyChallenge}</p>}
              {data.stressCoping.helpfulStrategies && <p><span className="font-semibold text-slate-500">Helpful Strategies: </span>{data.stressCoping.helpfulStrategies}</p>}
            </div>
          </Section>
        </div>

        {/* Career */}
        <Section title="Career Suitability">
          <div className="space-y-3 text-sm text-slate-700">
            <p><span className="font-semibold text-slate-500">Environments: </span>{data.careerSuitability.overview}</p>
            {data.careerSuitability.whyFit && <p><span className="font-semibold text-slate-500">Why It May Fit: </span>{data.careerSuitability.whyFit}</p>}
            
            <div className="pt-2">
              <p className="font-semibold text-slate-500 mb-2">Potentially Compatible Roles:</p>
              <div className="flex flex-wrap gap-2">
                {data.careerSuitability.roles.map((c, i) => (
                  <span key={i} className="bg-neu-bg shadow-neu-flat text-[#1e3a5f] text-xs font-bold px-4 py-2 rounded-xl">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            
            {data.careerSuitability.caveat && (
              <p className="text-xs text-slate-400 italic mt-3 pt-3 border-t border-slate-100">{data.careerSuitability.caveat}</p>
            )}
          </div>
        </Section>

        {/* Motivational Drivers */}
        <Section title="Motivational Drivers">
          <BulletList items={data.motivationalDrivers} />
        </Section>

        {/* Development Areas */}
        <Section title="Development Areas">
          <div className="space-y-4">
            {data.developmentAreas.map((dev, i) => (
              <div key={i} className="text-sm text-slate-700">
                <p className="font-semibold text-[#1e3a5f]">{dev.area}</p>
                {dev.whyItMatters && <p className="mt-1"><span className="text-slate-500 font-medium">Why it matters: </span>{dev.whyItMatters}</p>}
                {dev.practicalGrowth && <p className="mt-1"><span className="text-slate-500 font-medium">Growth direction: </span>{dev.practicalGrowth}</p>}
              </div>
            ))}
          </div>
        </Section>

        {/* Recommendations */}
        <Section title="Personalised Action Plan">
          <div className="space-y-4">
            {data.actionPlan.map((rec, i) => (
              <div key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="shrink-0 w-8 h-8 bg-neu-bg shadow-neu-pressed text-[#1e3a5f] text-sm font-black rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold text-[#1e3a5f]">{rec.action}</p>
                  {rec.why && <p className="mt-1 leading-relaxed">{rec.why}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Summary */}
        <Section title="Summary">
          <p className="text-sm text-slate-700 leading-relaxed font-medium">{data.summary}</p>
        </Section>

        {/* Download CTA */}
        <div className="bg-neu-bg shadow-neu-pressed rounded-3xl p-10 text-center mb-8 border-4 border-neu-bg">
          <p className="text-[#1e3a5f] text-xl font-bold mb-2">Save your report</p>
          <p className="text-slate-500 text-sm mb-6 font-medium">Download a PDF copy for your records.</p>
          <a
            href={`/api/report/${id}/pdf`}
            className="inline-block bg-neu-bg shadow-neu-flat hover:shadow-neu-pressed text-[#1e3a5f] font-bold px-8 py-4 rounded-xl transition-all"
            download
          >
            ⬇ Download PDF Report
          </a>
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-slate-400 leading-relaxed text-center px-4 pb-8">
          {data.disclaimer}
        </div>
      </main>
    </div>
  );
}
