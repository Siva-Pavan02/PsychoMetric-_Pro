/**
 * Scoring engine tests — src/lib/scoring/engine.ts
 *
 * Pure unit tests: no Prisma, no DB, no network, no env vars.
 *
 * Expectations are DERIVED from the actual QUESTIONS definitions rather than
 * hardcoding how many items are reverse-scored. Four anchors are independent of
 * the implementation entirely and are the real proofs:
 *   - all-3s   -> exactly the midpoint (50)
 *   - all-min-contribution -> exactly 0
 *   - all-max-contribution -> exactly 100
 *   - score(all 1s) + score(all 5s) === 100 per trait (reverse-score complement)
 */

import { scoreAssessment } from "@/lib/scoring/engine";
import { QUESTIONS, getQuestionTexts } from "@/data/questions";
import { RawResponse, Trait, TraitScores, Question } from "@/types";

const LIKERT_MIN = 1;
const LIKERT_MAX = 5;

const TRAITS: Trait[] = [
  "OPENNESS",
  "CONSCIENTIOUSNESS",
  "EXTRAVERSION",
  "AGREEABLENESS",
  "NEUROTICISM",
];

/** Trait enum -> TraitScores property. */
const SCORE_KEY: Record<Trait, keyof TraitScores> = {
  OPENNESS: "openness",
  CONSCIENTIOUSNESS: "conscientiousness",
  EXTRAVERSION: "extraversion",
  AGREEABLENESS: "agreeableness",
  NEUROTICISM: "neuroticism",
};

const itemsOf = (trait: Trait): Question[] => QUESTIONS.filter((q) => q.trait === trait);

/** Every question answered with the same value. */
const uniform = (answer: number): RawResponse[] =>
  QUESTIONS.map((q) => ({ questionId: q.id, answer }));

/** Answer chosen per question. */
const perQuestion = (fn: (q: Question) => number): RawResponse[] =>
  QUESTIONS.map((q) => ({ questionId: q.id, answer: fn(q) }));

/** All five trait scores as an array, in TRAITS order. */
const allScores = (s: TraitScores): number[] => TRAITS.map((t) => s[SCORE_KEY[t]]);

/**
 * Independently derived expectation for a trait, from the real question data.
 * Mirrors the documented formula, not the engine's code path.
 */
function expectedScore(trait: Trait, answerFor: (q: Question) => number): number {
  const items = itemsOf(trait);
  const sum = items.reduce(
    (acc, q) => acc + (q.reverseScored ? 6 - answerFor(q) : answerFor(q)),
    0
  );
  const min = items.length * LIKERT_MIN;
  const max = items.length * LIKERT_MAX;
  return Math.round(((sum - min) / (max - min)) * 100 * 10) / 10;
}

// ─── Question configuration (pins the data the engine's constants assume) ────

describe("question configuration", () => {
  test("exactly 50 questions with unique IDs", () => {
    expect(QUESTIONS).toHaveLength(50);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(50);
  });

  test("exactly 10 questions per OCEAN trait", () => {
    // engine.ts hardcodes QUESTIONS_PER_TRAIT = 10 to build TRAIT_MIN/TRAIT_MAX.
    // If the data ever drifts from 10, normalization silently breaks.
    for (const trait of TRAITS) {
      expect(itemsOf(trait)).toHaveLength(10);
    }
  });

  test("orders are the unique sequence 1..50", () => {
    expect([...QUESTIONS.map((q) => q.order)].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1)
    );
  });

  test("every trait has at least one reverse-scored item", () => {
    // Reverse items are what make the complement test meaningful.
    for (const trait of TRAITS) {
      expect(itemsOf(trait).filter((q) => q.reverseScored).length).toBeGreaterThan(0);
    }
  });

  test("getQuestionTexts() does not mutate the exported QUESTIONS array", () => {
    // QUESTIONS is module-level state that scoreAssessment also iterates, so an
    // in-place .sort() here would be a cross-request side effect. Spying on the
    // array's own sort is what discriminates: sorting a copy never touches it.
    const sortSpy = jest.spyOn(QUESTIONS, "sort");
    const snapshot = QUESTIONS.map((q) => q.id);

    try {
      const result = getQuestionTexts();

      expect(sortSpy).not.toHaveBeenCalled();
      expect(QUESTIONS.map((q) => q.id)).toEqual(snapshot);
      expect(result).toHaveLength(50);
      expect(result.map((q) => q.order)).toEqual(
        Array.from({ length: 50 }, (_, i) => i + 1)
      );
    } finally {
      sortSpy.mockRestore();
    }
  });

  test("getQuestionTexts() exposes no scoring metadata", () => {
    for (const q of getQuestionTexts()) {
      expect(Object.keys(q).sort()).toEqual(["id", "order", "text"]);
    }
  });
});

// ─── A. All neutral answers ─────────────────────────────────────────────────

describe("A. all answers = 3 (neutral)", () => {
  const scores = scoreAssessment(uniform(3));

  test("every trait scores the exact midpoint of 50", () => {
    // Implementation-independent: midpoint of a 0-100 scale.
    for (const s of allScores(scores)) expect(s).toBe(50);
  });

  test("reverse scoring does not alter an answer of 3", () => {
    // 6 - 3 === 3, so a broken reverse rule cannot be detected here.
    // Guarded by the complement and boundary tests below.
    expect(6 - 3).toBe(3);
    expect(allScores(scores)).toEqual([50, 50, 50, 50, 50]);
  });
});

// ─── B & C. All 5s and all 1s ───────────────────────────────────────────────

describe("B. all answers = 5", () => {
  const scores = scoreAssessment(uniform(5));

  test("each trait matches the value derived from its own question set", () => {
    for (const trait of TRAITS) {
      expect(scores[SCORE_KEY[trait]]).toBe(expectedScore(trait, () => 5));
    }
  });

  test("score is below 100 because reverse items subtract", () => {
    for (const s of allScores(scores)) expect(s).toBeLessThan(100);
  });
});

describe("C. all answers = 1", () => {
  const scores = scoreAssessment(uniform(1));

  test("each trait matches the value derived from its own question set", () => {
    for (const trait of TRAITS) {
      expect(scores[SCORE_KEY[trait]]).toBe(expectedScore(trait, () => 1));
    }
  });

  test("score is above 0 because reverse items add", () => {
    for (const s of allScores(scores)) expect(s).toBeGreaterThan(0);
  });
});

// ─── D. Reverse-score complement ────────────────────────────────────────────

describe("D. reverse-score complement", () => {
  const low = scoreAssessment(uniform(1));
  const high = scoreAssessment(uniform(5));

  test("score(all 1s) + score(all 5s) === 100 for every trait", () => {
    // Holds only if reverse scoring is the involution 6-x AND normalization is
    // linear. Derived from no assumption about reverse-item counts.
    for (const trait of TRAITS) {
      const key = SCORE_KEY[trait];
      expect(low[key] + high[key]).toBeCloseTo(100, 10);
    }
  });
});

// ─── E. Boundary values 0 and 100 ───────────────────────────────────────────

describe("E. boundaries", () => {
  // Make every item contribute its minimum (1) / maximum (5) after reversal.
  const minContribution = perQuestion((q) => (q.reverseScored ? 5 : 1));
  const maxContribution = perQuestion((q) => (q.reverseScored ? 1 : 5));

  test("every trait scores exactly 0 at the floor", () => {
    for (const s of allScores(scoreAssessment(minContribution))) expect(s).toBe(0);
  });

  test("every trait scores exactly 100 at the ceiling", () => {
    for (const s of allScores(scoreAssessment(maxContribution))) expect(s).toBe(100);
  });
});

// ─── F. Score range ─────────────────────────────────────────────────────────

describe("F. score range", () => {
  const sets: RawResponse[][] = [
    uniform(1),
    uniform(2),
    uniform(3),
    uniform(4),
    uniform(5),
    perQuestion((q) => (q.reverseScored ? 5 : 1)),
    perQuestion((q) => (q.reverseScored ? 1 : 5)),
    perQuestion((q) => (q.order % 5) + 1),
    perQuestion((q) => ((q.order * 7) % 5) + 1),
    perQuestion((q) => (q.order % 2 === 0 ? 2 : 4)),
  ];

  test("0 <= score <= 100 for every trait across representative sets", () => {
    for (const set of sets) {
      for (const s of allScores(scoreAssessment(set))) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ─── G. Invalid answers ─────────────────────────────────────────────────────

describe("G. invalid answers are rejected", () => {
  const target = QUESTIONS[0].id;

  const invalid: [string, number][] = [
    ["zero", 0],
    ["six", 6],
    ["negative", -1],
    ["above five", 7],
    ["large negative", -100],
    ["fractional 3.5", 3.5],
    ["fractional 1.0001", 1.0001],
    ["NaN", NaN],
    ["Infinity", Infinity],
  ];

  test.each(invalid)("rejects %s", (_label, value) => {
    const responses = uniform(3).map((r) =>
      r.questionId === target ? { ...r, answer: value } : r
    );
    expect(() => scoreAssessment(responses)).toThrow(/Invalid answer/);
  });

  test("rejects an invalid value on the last question too", () => {
    const last = QUESTIONS[QUESTIONS.length - 1].id;
    const responses = uniform(3).map((r) =>
      r.questionId === last ? { ...r, answer: 9 } : r
    );
    expect(() => scoreAssessment(responses)).toThrow(/Invalid answer/);
  });

  test("accepts every valid integer 1..5", () => {
    for (let v = LIKERT_MIN; v <= LIKERT_MAX; v++) {
      expect(() => scoreAssessment(uniform(v))).not.toThrow();
    }
  });
});

// ─── H. Missing response ────────────────────────────────────────────────────

describe("H. missing response", () => {
  test("49 responses throws, naming the absent question", () => {
    const full = uniform(3);
    const dropped = full[full.length - 1];
    const responses = full.slice(0, 49);

    expect(responses).toHaveLength(49);
    expect(() => scoreAssessment(responses)).toThrow(
      new RegExp(`Missing response for question ${dropped.questionId}`)
    );
  });

  test("empty response set throws", () => {
    expect(() => scoreAssessment([])).toThrow(/Missing response/);
  });
});

// ─── I. Duplicate question ID ───────────────────────────────────────────────

describe("I. duplicate question ID", () => {
  test("50 entries with one ID duplicated and another missing is rejected", () => {
    const responses = uniform(3);
    const duplicatedId = responses[0].questionId;
    const displacedId = responses[responses.length - 1].questionId;

    // Overwrite the last entry with a copy of the first: length stays 50,
    // but only 49 distinct IDs are covered.
    responses[responses.length - 1] = { questionId: duplicatedId, answer: 3 };

    expect(responses).toHaveLength(50);
    expect(new Set(responses.map((r) => r.questionId)).size).toBe(49);
    expect(() => scoreAssessment(responses)).toThrow(
      new RegExp(`Missing response for question ${displacedId}`)
    );
  });

  test("documents last-wins when a duplicate is APPENDED (51 entries)", () => {
    // All 50 IDs are present, so validation passes and the engine's Map keeps
    // the last value for the repeated ID. Upstream Zod (.length(50)) rejects a
    // 51-entry payload, so this path is unreachable via the API — pinned here
    // so the tolerance is visible if that guard ever changes.
    const responses = [...uniform(3), { questionId: QUESTIONS[0].id, answer: 5 }];
    expect(responses).toHaveLength(51);

    const scores = scoreAssessment(responses);
    const overridden = expectedScore(QUESTIONS[0].trait, (q) =>
      q.id === QUESTIONS[0].id ? 5 : 3
    );
    expect(scores[SCORE_KEY[QUESTIONS[0].trait]]).toBe(overridden);
  });
});

// ─── J. Determinism ─────────────────────────────────────────────────────────

describe("J. determinism", () => {
  test("identical input produces identical output", () => {
    const responses = perQuestion((q) => (q.order % 5) + 1);
    expect(scoreAssessment(responses)).toEqual(scoreAssessment(responses));
  });

  test("repeated runs over many sets never drift", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const responses = perQuestion((q) => ((q.order * seed) % 5) + 1);
      const first = scoreAssessment(responses);
      for (let i = 0; i < 3; i++) {
        expect(scoreAssessment(responses)).toEqual(first);
      }
    }
  });
});

// ─── K. Order independence ──────────────────────────────────────────────────

describe("K. order independence", () => {
  const responses = perQuestion((q) => (q.order % 5) + 1);
  const baseline = scoreAssessment(responses);

  test("reversed response array yields identical scores", () => {
    expect(scoreAssessment([...responses].reverse())).toEqual(baseline);
  });

  test("deterministically shuffled response array yields identical scores", () => {
    // Fixed permutation — no RNG, so failures are reproducible.
    const shuffled = [...responses].sort((a, b) =>
      a.questionId.length - b.questionId.length || a.questionId.localeCompare(b.questionId)
    );
    expect(shuffled.map((r) => r.questionId)).not.toEqual(responses.map((r) => r.questionId));
    expect(scoreAssessment(shuffled)).toEqual(baseline);
  });
});

// ─── L. Score granularity ───────────────────────────────────────────────────

describe("L. score granularity", () => {
  // Derived, not assumed: each trait sums `n` integer items over a span of
  // (LIKERT_MAX - LIKERT_MIN), so the smallest representable step is
  // 100 / (n * span).
  const itemsPerTrait = itemsOf("OPENNESS").length;
  const step = 100 / (itemsPerTrait * (LIKERT_MAX - LIKERT_MIN));

  test("granularity derived from the question set is 2.5", () => {
    expect(itemsPerTrait).toBe(10);
    expect(step).toBe(2.5);
  });

  test("every achievable score is an exact multiple of the step", () => {
    const sets: RawResponse[][] = [
      ...[1, 2, 3, 4, 5].map((v) => uniform(v)),
      perQuestion((q) => (q.reverseScored ? 5 : 1)),
      perQuestion((q) => (q.reverseScored ? 1 : 5)),
      ...[1, 3, 7, 11].map((seed) => perQuestion((q) => ((q.order * seed) % 5) + 1)),
    ];

    for (const set of sets) {
      for (const s of allScores(scoreAssessment(set))) {
        expect(Number.isInteger(Math.round((s / step) * 1e6) / 1e6)).toBe(true);
      }
    }
  });

  test("scores carry at most one decimal place", () => {
    for (const set of [uniform(2), uniform(4), perQuestion((q) => (q.order % 5) + 1)]) {
      for (const s of allScores(scoreAssessment(set))) {
        expect(Math.round(s * 10) / 10).toBe(s);
      }
    }
  });

  test("no achievable score can fall inside the reported legend gaps", () => {
    // The report legend prints Low 0-39 / Moderate 40-69 / High 70-100 while
    // classify() uses < 40 and < 70. Quantization to 2.5 means no score can
    // land in (39,40) or (69,70), so legend and thresholds cannot disagree.
    const achievable: number[] = [];
    const min = itemsPerTrait * LIKERT_MIN;
    const max = itemsPerTrait * LIKERT_MAX;
    for (let sum = min; sum <= max; sum++) {
      achievable.push(Math.round(((sum - min) / (max - min)) * 100 * 10) / 10);
    }

    expect(achievable).toHaveLength(41);
    for (const s of achievable) {
      expect(s > 39 && s < 40).toBe(false);
      expect(s > 69 && s < 70).toBe(false);
    }
  });
});
