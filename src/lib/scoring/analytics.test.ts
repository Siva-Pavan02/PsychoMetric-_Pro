import { calculateQuestionStats, findTopPatterns } from "./analytics";
import { RawResponse } from "@/types";

describe("Analytics logic", () => {
  it("calculates stats correctly for empty responses", () => {
    const stats = calculateQuestionStats([]);
    expect(stats.length).toBe(50);
    expect(stats[0].total).toBe(0);
    expect(stats[0].percentages).toEqual([0, 0, 0, 0, 0]);
    expect(stats[0].mostCommon).toBe("None");
  });

  it("calculates distributions correctly", () => {
    const responses: RawResponse[] = [
      { questionId: "O1", answer: 4 },
      { questionId: "O1", answer: 4 },
      { questionId: "O1", answer: 5 },
      { questionId: "O1", answer: 3 },
      { questionId: "O2", answer: 1 },
    ];

    const stats = calculateQuestionStats(responses);
    const o1 = stats.find(s => s.id === "O1")!;
    
    expect(o1.total).toBe(4);
    expect(o1.counts).toEqual([0, 0, 1, 2, 1]);
    expect(o1.percentages).toEqual([0, 0, 25, 50, 25]);
    expect(o1.mostCommon).toBe("Agree");
    expect(o1.agreementRate).toBe(75); // 50 + 25
    expect(o1.neutralRate).toBe(25);
    expect(o1.disagreementRate).toBe(0);

    const o2 = stats.find(s => s.id === "O2")!;
    expect(o2.total).toBe(1);
    expect(o2.counts).toEqual([1, 0, 0, 0, 0]);
    expect(o2.mostCommon).toBe("Strongly Disagree");
  });

  it("filters by trait", () => {
    const responses: RawResponse[] = [
      { questionId: "O1", answer: 4 },
      { questionId: "C1", answer: 2 },
    ];
    
    const stats = calculateQuestionStats(responses, "OPENNESS");
    expect(stats.length).toBe(10); // There are 10 openness questions
    expect(stats.every(s => s.trait === "OPENNESS")).toBe(true);
  });

  it("finds top patterns", () => {
    const responses: RawResponse[] = [
      // Q1 has 100% agreement
      { questionId: "O1", answer: 4 },
      { questionId: "O1", answer: 5 },
      // Q2 has 100% disagreement
      { questionId: "O2", answer: 1 },
      { questionId: "O2", answer: 2 },
      // Q3 has 100% neutral
      { questionId: "O3", answer: 3 },
      { questionId: "O3", answer: 3 },
    ];

    const stats = calculateQuestionStats(responses);
    const top = findTopPatterns(stats);

    expect(top.highestAgreement?.id).toBe("O1");
    expect(top.highestDisagreement?.id).toBe("O2");
    expect(top.mostNeutral?.id).toBe("O3");
  });
});
