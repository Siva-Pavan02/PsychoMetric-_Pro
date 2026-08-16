/**
 * Deterministic OCEAN scoring engine.
 *
 * Inputs:  raw responses + question definitions (server-only)
 * Outputs: TraitScores (0-100 each)
 *
 * Pipeline:
 *  1. Validate every response is 1-5
 *  2. Apply reverse scoring (reverseScore = 6 - answer)
 *  3. Sum by trait
 *  4. Normalize: (sum - minPossible) / (maxPossible - minPossible) * 100
 *  5. Round to 1 decimal
 */

import { QUESTIONS } from "@/data/questions";
import { RawResponse, TraitScores } from "@/types";

const QUESTIONS_PER_TRAIT = 10;
const LIKERT_MIN = 1;
const LIKERT_MAX = 5;
const TRAIT_MIN = QUESTIONS_PER_TRAIT * LIKERT_MIN; // 10
const TRAIT_MAX = QUESTIONS_PER_TRAIT * LIKERT_MAX; // 50

function reverseScore(answer: number): number {
  return 6 - answer;
}

function normalize(raw: number): number {
  const pct = ((raw - TRAIT_MIN) / (TRAIT_MAX - TRAIT_MIN)) * 100;
  return Math.round(pct * 10) / 10; // 1 decimal
}

export function scoreAssessment(responses: RawResponse[]): TraitScores {
  const responseMap = new Map(responses.map((r) => [r.questionId, r.answer]));

  // Validate: every question must have a valid answer
  for (const q of QUESTIONS) {
    const answer = responseMap.get(q.id);
    if (answer === undefined) {
      throw new Error(`Missing response for question ${q.id}`);
    }
    if (!Number.isInteger(answer) || answer < LIKERT_MIN || answer > LIKERT_MAX) {
      throw new Error(`Invalid answer ${answer} for question ${q.id}`);
    }
  }

  const sums: Record<string, number> = {
    OPENNESS: 0,
    CONSCIENTIOUSNESS: 0,
    EXTRAVERSION: 0,
    AGREEABLENESS: 0,
    NEUROTICISM: 0,
  };

  for (const q of QUESTIONS) {
    const raw = responseMap.get(q.id)!;
    const scored = q.reverseScored ? reverseScore(raw) : raw;
    sums[q.trait] += scored;
  }

  return {
    openness:          normalize(sums.OPENNESS),
    conscientiousness: normalize(sums.CONSCIENTIOUSNESS),
    extraversion:      normalize(sums.EXTRAVERSION),
    agreeableness:     normalize(sums.AGREEABLENESS),
    neuroticism:       normalize(sums.NEUROTICISM),
  };
}
