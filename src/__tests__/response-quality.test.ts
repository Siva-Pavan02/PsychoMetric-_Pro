/**
 * responseQuality.valid must track the actual flags — src/lib/scoring/interpret.ts
 *
 * Pure unit tests: no Prisma, no DB, no network, no env vars.
 */

import { interpretScores } from "@/lib/scoring/interpret";
import { scoreAssessment } from "@/lib/scoring/engine";
import { QUESTIONS } from "@/data/questions";
import { RawResponse } from "@/types";

const responsesFrom = (answerFor: (order: number) => number): RawResponse[] =>
  QUESTIONS.map((q) => ({ questionId: q.id, answer: answerFor(q.order) }));

const quality = (responses: RawResponse[]) =>
  interpretScores(
    scoreAssessment(responses),
    responses,
    "Test Participant",
    "test-assessment-id",
    "2026-08-31T00:00:00.000Z"
  ).responseQuality;

describe("responseQuality.valid", () => {
  test("straight-lined all-3s answers are flagged and marked invalid", () => {
    const { flags, valid } = quality(responsesFrom(() => 3));

    // sd === 0 (< 0.5) and 100% neutral (> 0.8) both trip.
    expect(flags.length).toBeGreaterThan(0);
    expect(valid).toBe(false);
  });

  test("straight-lined all-1s answers are flagged and marked invalid", () => {
    const { flags, valid } = quality(responsesFrom(() => 1));

    // sd === 0 and 100% extreme responses both trip.
    expect(flags.length).toBeGreaterThan(0);
    expect(valid).toBe(false);
  });

  test("a well-spread response set produces no flags and stays valid", () => {
    const { flags, valid } = quality(responsesFrom((order) => (order % 5) + 1));

    expect(flags).toEqual([]);
    expect(valid).toBe(true);
  });

  test("valid always equals flags.length === 0 across varied sets", () => {
    const sets: RawResponse[][] = [
      responsesFrom(() => 1),
      responsesFrom(() => 3),
      responsesFrom(() => 5),
      responsesFrom((order) => (order % 5) + 1),
      responsesFrom((order) => (order % 2 === 0 ? 2 : 4)),
      responsesFrom((order) => (order % 3 === 0 ? 1 : 5)),
    ];

    for (const set of sets) {
      const { flags, valid } = quality(set);
      expect(valid).toBe(flags.length === 0);
    }
  });
});
