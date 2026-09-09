import { RawResponse } from "@/types";
import { QUESTIONS } from "@/data/questions";

export interface QuestionStat {
  id: string;
  text: string;
  trait: string;
  counts: [number, number, number, number, number]; // 1, 2, 3, 4, 5
  total: number;
  percentages: [number, number, number, number, number];
  mostCommon: string;
  agreementRate: number; // % of 4+5
  disagreementRate: number; // % of 1+2
  neutralRate: number; // % of 3
}

const RESPONSE_LABELS = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree"
];

export function calculateQuestionStats(responses: RawResponse[], traitFilter?: string): QuestionStat[] {
  const statsMap = new Map<string, [number, number, number, number, number]>();
  
  for (const q of QUESTIONS) {
    if (!traitFilter || q.trait === traitFilter) {
      statsMap.set(q.id, [0, 0, 0, 0, 0]);
    }
  }

  for (const r of responses) {
    const counts = statsMap.get(r.questionId);
    if (counts && r.answer >= 1 && r.answer <= 5) {
      counts[r.answer - 1]++;
    }
  }

  const result: QuestionStat[] = [];
  
  for (const q of QUESTIONS) {
    if (traitFilter && q.trait !== traitFilter) continue;
    
    const counts = statsMap.get(q.id)!;
    const total = counts.reduce((a, b) => a + b, 0);
    
    const percentages: [number, number, number, number, number] = total === 0 
      ? [0, 0, 0, 0, 0] 
      : [
          (counts[0] / total) * 100,
          (counts[1] / total) * 100,
          (counts[2] / total) * 100,
          (counts[3] / total) * 100,
          (counts[4] / total) * 100,
        ];

    const maxCount = Math.max(...counts);
    const mostCommonIndex = counts.indexOf(maxCount);
    const mostCommon = total > 0 ? RESPONSE_LABELS[mostCommonIndex] : "None";

    const agreementRate = total > 0 ? percentages[3] + percentages[4] : 0;
    const disagreementRate = total > 0 ? percentages[0] + percentages[1] : 0;
    const neutralRate = total > 0 ? percentages[2] : 0;

    result.push({
      id: q.id,
      text: q.text,
      trait: q.trait,
      counts,
      total,
      percentages,
      mostCommon,
      agreementRate,
      disagreementRate,
      neutralRate
    });
  }

  return result;
}

export function findTopPatterns(stats: QuestionStat[]) {
  if (stats.length === 0 || stats.every(s => s.total === 0)) {
    return {
      highestAgreement: null,
      highestDisagreement: null,
      mostNeutral: null
    };
  }

  const validStats = stats.filter(s => s.total > 0);
  if (validStats.length === 0) {
    return { highestAgreement: null, highestDisagreement: null, mostNeutral: null };
  }

  const highestAgreement = [...validStats].sort((a, b) => b.agreementRate - a.agreementRate)[0];
  const highestDisagreement = [...validStats].sort((a, b) => b.disagreementRate - a.disagreementRate)[0];
  const mostNeutral = [...validStats].sort((a, b) => b.neutralRate - a.neutralRate)[0];

  return { highestAgreement, highestDisagreement, mostNeutral };
}
