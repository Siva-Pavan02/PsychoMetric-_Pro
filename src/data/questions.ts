import { Question } from "@/types";

/**
 * 50 Big Five / OCEAN questions — 10 per trait.
 * ~3 per trait are reverse-scored for response validity.
 * Order numbers are sequential for display.
 *
 * IMPORTANT: These IDs are stored permanently in the Response table.
 * Never change an existing question's ID after data has been collected.
 */
export const QUESTIONS: Question[] = [
  // ─── OPENNESS (O1–O10) ───────────────────────────────────────────────────
  { id: "O1",  text: "I enjoy exploring new ideas and concepts.",            trait: "OPENNESS", reverseScored: false, order: 1  },
  { id: "O2",  text: "I find beauty in things others might overlook.",       trait: "OPENNESS", reverseScored: false, order: 2  },
  { id: "O3",  text: "I enjoy reading books on a wide variety of topics.",   trait: "OPENNESS", reverseScored: false, order: 3  },
  { id: "O4",  text: "I am imaginative and often think in vivid pictures.",  trait: "OPENNESS", reverseScored: false, order: 4  },
  { id: "O5",  text: "I enjoy trying out new and different activities.",     trait: "OPENNESS", reverseScored: false, order: 5  },
  { id: "O6",  text: "I enjoy artistic or creative experiences.",            trait: "OPENNESS", reverseScored: false, order: 6  },
  { id: "O7",  text: "I prefer sticking to familiar routines over trying new things.", trait: "OPENNESS", reverseScored: true, order: 7 },
  { id: "O8",  text: "I rarely question conventional ways of doing things.", trait: "OPENNESS", reverseScored: true, order: 8  },
  { id: "O9",  text: "I am curious about how things in nature and society work.", trait: "OPENNESS", reverseScored: false, order: 9 },
  { id: "O10", text: "I tend to avoid abstract or philosophical discussions.", trait: "OPENNESS", reverseScored: true, order: 10 },

  // ─── CONSCIENTIOUSNESS (C1–C10) ──────────────────────────────────────────
  { id: "C1",  text: "I always complete tasks before moving on to new ones.",       trait: "CONSCIENTIOUSNESS", reverseScored: false, order: 11 },
  { id: "C2",  text: "I keep my belongings neat and organised.",                   trait: "CONSCIENTIOUSNESS", reverseScored: false, order: 12 },
  { id: "C3",  text: "I set clear goals and work towards them systematically.",     trait: "CONSCIENTIOUSNESS", reverseScored: false, order: 13 },
  { id: "C4",  text: "I pay attention to details even in routine tasks.",           trait: "CONSCIENTIOUSNESS", reverseScored: false, order: 14 },
  { id: "C5",  text: "I am punctual and meet my deadlines.",                        trait: "CONSCIENTIOUSNESS", reverseScored: false, order: 15 },
  { id: "C6",  text: "I often procrastinate on important tasks.",                   trait: "CONSCIENTIOUSNESS", reverseScored: true,  order: 16 },
  { id: "C7",  text: "I follow through on the commitments I make to others.",       trait: "CONSCIENTIOUSNESS", reverseScored: false, order: 17 },
  { id: "C8",  text: "I find it hard to maintain a structured daily routine.",      trait: "CONSCIENTIOUSNESS", reverseScored: true,  order: 18 },
  { id: "C9",  text: "I take my responsibilities very seriously.",                  trait: "CONSCIENTIOUSNESS", reverseScored: false, order: 19 },
  { id: "C10", text: "I often lose track of my things.",                            trait: "CONSCIENTIOUSNESS", reverseScored: true,  order: 20 },

  // ─── EXTRAVERSION (E1–E10) ───────────────────────────────────────────────
  { id: "E1",  text: "I feel energised when I am around other people.",      trait: "EXTRAVERSION", reverseScored: false, order: 21 },
  { id: "E2",  text: "I enjoy being the centre of attention in a group.",    trait: "EXTRAVERSION", reverseScored: false, order: 22 },
  { id: "E3",  text: "I find it easy to start conversations with strangers.", trait: "EXTRAVERSION", reverseScored: false, order: 23 },
  { id: "E4",  text: "I love attending social events and gatherings.",        trait: "EXTRAVERSION", reverseScored: false, order: 24 },
  { id: "E5",  text: "I prefer spending time alone over being in groups.",    trait: "EXTRAVERSION", reverseScored: true,  order: 25 },
  { id: "E6",  text: "I am talkative and expressive in social settings.",     trait: "EXTRAVERSION", reverseScored: false, order: 26 },
  { id: "E7",  text: "I feel drained after extended social interactions.",    trait: "EXTRAVERSION", reverseScored: true,  order: 27 },
  { id: "E8",  text: "I enjoy leading or directing group activities.",         trait: "EXTRAVERSION", reverseScored: false, order: 28 },
  { id: "E9",  text: "I feel comfortable speaking in front of an audience.",  trait: "EXTRAVERSION", reverseScored: false, order: 29 },
  { id: "E10", text: "I tend to keep to myself rather than open up to others.", trait: "EXTRAVERSION", reverseScored: true, order: 30 },

  // ─── AGREEABLENESS (A1–A10) ──────────────────────────────────────────────
  { id: "A1",  text: "I genuinely care about the wellbeing of others.",       trait: "AGREEABLENESS", reverseScored: false, order: 31 },
  { id: "A2",  text: "I am willing to compromise to avoid conflicts.",        trait: "AGREEABLENESS", reverseScored: false, order: 32 },
  { id: "A3",  text: "I find it easy to forgive people who have wronged me.", trait: "AGREEABLENESS", reverseScored: false, order: 33 },
  { id: "A4",  text: "I enjoy cooperating with others more than competing.",  trait: "AGREEABLENESS", reverseScored: false, order: 34 },
  { id: "A5",  text: "I tend to be critical or suspicious of other people's motives.", trait: "AGREEABLENESS", reverseScored: true, order: 35 },
  { id: "A6",  text: "I show empathy towards people going through difficulties.", trait: "AGREEABLENESS", reverseScored: false, order: 36 },
  { id: "A7",  text: "I get into arguments or disagreements with others easily.", trait: "AGREEABLENESS", reverseScored: true, order: 37 },
  { id: "A8",  text: "I try to be kind and considerate in all my interactions.", trait: "AGREEABLENESS", reverseScored: false, order: 38 },
  { id: "A9",  text: "I find it difficult to trust people I do not know well.", trait: "AGREEABLENESS", reverseScored: true, order: 39 },
  { id: "A10", text: "I am willing to help others even at a personal cost to myself.", trait: "AGREEABLENESS", reverseScored: false, order: 40 },

  // ─── NEUROTICISM (N1–N10) ────────────────────────────────────────────────
  { id: "N1",  text: "I often feel anxious or worried without a clear reason.",    trait: "NEUROTICISM", reverseScored: false, order: 41 },
  { id: "N2",  text: "I experience frequent mood swings.",                         trait: "NEUROTICISM", reverseScored: false, order: 42 },
  { id: "N3",  text: "I tend to feel stressed or overwhelmed easily.",              trait: "NEUROTICISM", reverseScored: false, order: 43 },
  { id: "N4",  text: "I remain calm under pressure most of the time.",             trait: "NEUROTICISM", reverseScored: true,  order: 44 },
  { id: "N5",  text: "I often dwell on negative thoughts or past mistakes.",        trait: "NEUROTICISM", reverseScored: false, order: 45 },
  { id: "N6",  text: "I feel emotionally stable even in difficult situations.",     trait: "NEUROTICISM", reverseScored: true,  order: 46 },
  { id: "N7",  text: "I am easily upset when things do not go as planned.",         trait: "NEUROTICISM", reverseScored: false, order: 47 },
  { id: "N8",  text: "I frequently feel low in energy or motivation.",              trait: "NEUROTICISM", reverseScored: false, order: 48 },
  { id: "N9",  text: "I handle criticism without feeling excessively hurt.",        trait: "NEUROTICISM", reverseScored: true,  order: 49 },
  { id: "N10", text: "I tend to feel self-conscious or embarrassed in social situations.", trait: "NEUROTICISM", reverseScored: false, order: 50 },
];

export const QUESTION_COUNT = QUESTIONS.length; // 50

/** Returns questions sorted by order — safe to call from client (no scoring metadata). */
export function getQuestionTexts(): { id: string; text: string; order: number }[] {
  return QUESTIONS
    .sort((a, b) => a.order - b.order)
    .map(({ id, text, order }) => ({ id, text, order }));
}
