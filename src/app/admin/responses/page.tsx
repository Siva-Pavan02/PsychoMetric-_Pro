import { db } from "@/lib/db";
import { calculateQuestionStats, findTopPatterns } from "@/lib/scoring/analytics";
import { deriveResponseQuality } from "@/lib/scoring/interpret";
import { RawResponse } from "@/types";

export const dynamic = "force-dynamic";

export default async function ResponsesAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ trait?: string }>;
}) {
  const { trait } = await searchParams;
  
  const assessments = await db.assessment.findMany({
    include: {
      responses: true,
      result: true,
      participant: true,
    },
  });

  const participantsCount = new Set(assessments.map(a => a.participantId)).size;
  const startedAssessments = assessments.length;
  
  const completedAssessments = assessments.filter((a) => a.status === "COMPLETED" || a.result);
  const completionRate = startedAssessments > 0 ? (completedAssessments.length / startedAssessments) * 100 : 0;
  
  const allResponses = completedAssessments.flatMap(a => a.responses) as RawResponse[];
  const totalResponses = allResponses.length;
  const averageQuestionsAnswered = completedAssessments.length > 0 ? totalResponses / completedAssessments.length : 0;

  // Response Quality metrics
  let validSets = 0;
  let flaggedSets = 0;
  let straightLined = 0;
  let extremeResponse = 0;
  let neutralHeavy = 0;

  for (const a of completedAssessments) {
    if (a.responses.length > 0) {
      const q = deriveResponseQuality(a.responses as RawResponse[]);
      if (q.valid) {
        validSets++;
      } else {
        flaggedSets++;
        if (q.flags.some(f => f.includes("straight-lining") || f.includes("variance"))) straightLined++;
        if (q.flags.some(f => f.includes("extreme responses"))) extremeResponse++;
        if (q.flags.some(f => f.includes("neutral responses"))) neutralHeavy++;
      }
    }
  }

  // Global response summary
  const globalCounts = [0, 0, 0, 0, 0];
  for (const r of allResponses) {
    if (r.answer >= 1 && r.answer <= 5) {
      globalCounts[r.answer - 1]++;
    }
  }

  const globalPercentages = totalResponses === 0 ? [0, 0, 0, 0, 0] : globalCounts.map(c => (c / totalResponses) * 100);

  const labels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

  // Question stats and patterns
  const questionStats = calculateQuestionStats(allResponses, trait);
  const topPatterns = findTopPatterns(calculateQuestionStats(allResponses)); // Top patterns always over all questions

  return (
    <div className="mx-auto max-w-4xl space-y-12 pb-12">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[#10233d]">User Input Analysis</h1>
        <p className="mt-2 text-sm text-slate-600">Raw participant response distributions and patterns.</p>
      </div>

      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
        <div>
          <p className="text-3xl font-black text-[#10233d]">{participantsCount}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Participants</p>
        </div>
        <div>
          <p className="text-3xl font-black text-[#10233d]">{startedAssessments}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Started Assessments</p>
        </div>
        <div>
          <p className="text-3xl font-black text-[#10233d]">{completedAssessments.length}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Assessments</p>
        </div>
        <div>
          <p className="text-3xl font-black text-[#10233d]">{validSets}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Valid Response Sets</p>
        </div>
        <div>
          <p className="text-3xl font-black text-[#10233d]">{averageQuestionsAnswered.toFixed(1)}</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Questions Answered</p>
        </div>
        <div>
          <p className="text-3xl font-black text-[#10233d]">{completionRate.toFixed(1)}%</p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completion Rate</p>
        </div>
      </div>

      <hr className="border-slate-200" />

      <section className="flex flex-col gap-8 sm:flex-row">
        <div className="flex-1">
          <h2 className="mb-6 text-xl font-bold text-[#10233d]">Response Summary</h2>
          <div className="space-y-3 max-w-sm">
            {labels.map((label, idx) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-bold text-slate-800">{globalPercentages[idx].toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <h2 className="mb-6 text-xl font-bold text-[#10233d]">Response Quality</h2>
          <div className="space-y-3 max-w-sm">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Valid</span>
              <span className="font-bold text-emerald-800">{validSets}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-600">Flagged</span>
              <span className="font-bold text-red-800">{flaggedSets}</span>
            </div>
            <div className="flex justify-between text-sm pl-4">
              <span className="text-slate-500">Straight-lined</span>
              <span className="font-medium text-slate-700">{straightLined}</span>
            </div>
            <div className="flex justify-between text-sm pl-4">
              <span className="text-slate-500">Extreme-heavy</span>
              <span className="font-medium text-slate-700">{extremeResponse}</span>
            </div>
            <div className="flex justify-between text-sm pl-4">
              <span className="text-slate-500">Neutral-heavy</span>
              <span className="font-medium text-slate-700">{neutralHeavy}</span>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-slate-200" />

      <section>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-[#10233d]">Question Analysis</h2>
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="traitFilter" className="text-sm font-medium text-slate-600">Filter:</label>
            <select 
              id="traitFilter"
              name="trait" 
              defaultValue={trait || ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">All Traits</option>
              <option value="OPENNESS">Openness</option>
              <option value="CONSCIENTIOUSNESS">Conscientiousness</option>
              <option value="EXTRAVERSION">Extraversion</option>
              <option value="AGREEABLENESS">Agreeableness</option>
              <option value="NEUROTICISM">Neuroticism</option>
            </select>
            <button type="submit" className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700">Apply</button>
          </form>
        </div>

        <div className="space-y-4">
          {questionStats.map(q => {
            if (q.total === 0) return null;
            return (
              <details key={q.id} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm open:bg-slate-50">
                <summary className="cursor-pointer font-medium text-slate-800 list-none flex items-center justify-between">
                  <span><span className="font-bold text-slate-500 mr-2">{q.id}</span> {q.text}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                
                <div className="mt-6 space-y-6 pl-8">
                  <div className="flex gap-1 h-6 w-full max-w-md overflow-hidden rounded-md bg-slate-100">
                    <div className="bg-red-400" style={{ width: `${q.percentages[0]}%` }} title={`Strongly Disagree: ${q.counts[0]}`} />
                    <div className="bg-orange-300" style={{ width: `${q.percentages[1]}%` }} title={`Disagree: ${q.counts[1]}`} />
                    <div className="bg-slate-300" style={{ width: `${q.percentages[2]}%` }} title={`Neutral: ${q.counts[2]}`} />
                    <div className="bg-emerald-300" style={{ width: `${q.percentages[3]}%` }} title={`Agree: ${q.counts[3]}`} />
                    <div className="bg-emerald-500" style={{ width: `${q.percentages[4]}%` }} title={`Strongly Agree: ${q.counts[4]}`} />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-8 text-sm">
                    <div className="space-y-2 flex-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Strongly Disagree</span>
                        <span className="font-medium text-slate-700">{q.percentages[0].toFixed(1)}% <span className="text-slate-400 text-xs">({q.counts[0]})</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Disagree</span>
                        <span className="font-medium text-slate-700">{q.percentages[1].toFixed(1)}% <span className="text-slate-400 text-xs">({q.counts[1]})</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Neutral</span>
                        <span className="font-medium text-slate-700">{q.percentages[2].toFixed(1)}% <span className="text-slate-400 text-xs">({q.counts[2]})</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Agree</span>
                        <span className="font-medium text-slate-700">{q.percentages[3].toFixed(1)}% <span className="text-slate-400 text-xs">({q.counts[3]})</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Strongly Agree</span>
                        <span className="font-medium text-slate-700">{q.percentages[4].toFixed(1)}% <span className="text-slate-400 text-xs">({q.counts[4]})</span></span>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1 border-t border-slate-200 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Most common response</p>
                        <p className="font-medium text-slate-800">{q.mostCommon}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Agreement rate</p>
                        <p className="font-medium text-emerald-600">{q.agreementRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Neutral rate</p>
                        <p className="font-medium text-slate-600">{q.neutralRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Disagreement rate</p>
                        <p className="font-medium text-red-600">{q.disagreementRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
          
          {questionStats.every(q => q.total === 0) && (
            <p className="py-8 text-center text-sm text-slate-500">No response data available for these questions yet.</p>
          )}
        </div>
      </section>

      <hr className="border-slate-200" />

      <section>
        <h2 className="mb-6 text-xl font-bold text-[#10233d]">Top Response Patterns</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-emerald-50 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Highest Agreement</h3>
            {topPatterns.highestAgreement ? (
              <div className="mt-4">
                <p className="font-bold text-emerald-950">{topPatterns.highestAgreement.id} — {topPatterns.highestAgreement.agreementRate.toFixed(1)}%</p>
                <p className="mt-2 text-sm text-emerald-800 line-clamp-2">{topPatterns.highestAgreement.text}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-emerald-700">Not enough data</p>
            )}
          </div>
          
          <div className="rounded-2xl border border-slate-200 bg-red-50 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-800">Highest Disagreement</h3>
            {topPatterns.highestDisagreement ? (
              <div className="mt-4">
                <p className="font-bold text-red-950">{topPatterns.highestDisagreement.id} — {topPatterns.highestDisagreement.disagreementRate.toFixed(1)}%</p>
                <p className="mt-2 text-sm text-red-800 line-clamp-2">{topPatterns.highestDisagreement.text}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-red-700">Not enough data</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Most Neutral</h3>
            {topPatterns.mostNeutral ? (
              <div className="mt-4">
                <p className="font-bold text-slate-800">{topPatterns.mostNeutral.id} — {topPatterns.mostNeutral.neutralRate.toFixed(1)}%</p>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{topPatterns.mostNeutral.text}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Not enough data</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
