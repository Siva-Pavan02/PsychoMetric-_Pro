import { interpretScores } from "../src/lib/scoring/interpret";
import { TraitScores } from "../src/types";

const tests: { name: string, scores: TraitScores }[] = [
  {
    name: "High Conscientiousness + High Agreeableness",
    scores: { openness: 50, conscientiousness: 85, extraversion: 50, agreeableness: 80, neuroticism: 45 }
  },
  {
    name: "High Conscientiousness + High Openness",
    scores: { openness: 80, conscientiousness: 85, extraversion: 50, agreeableness: 50, neuroticism: 45 }
  },
  {
    name: "High Openness + High Extraversion",
    scores: { openness: 85, conscientiousness: 50, extraversion: 80, agreeableness: 50, neuroticism: 45 }
  },
  {
    name: "Low Extraversion + High Agreeableness",
    scores: { openness: 50, conscientiousness: 50, extraversion: 20, agreeableness: 85, neuroticism: 45 }
  },
  {
    name: "High Neuroticism + High Conscientiousness",
    scores: { openness: 50, conscientiousness: 85, extraversion: 50, agreeableness: 50, neuroticism: 80 }
  }
];

function runTests() {
  for (const t of tests) {
    console.log(`\n======================================================`);
    console.log(`Testing: ${t.name}`);
    console.log(`======================================================`);
    const r = interpretScores(t.scores, [], "Test User", "test-123", new Date().toISOString());
    console.log(`Type: ${r.personalityTypeSummary}`);
    console.log(`Overall Profile:\n${r.overallProfile}`);
    console.log(`Top Strength: ${r.strengths[0].strength}`);
    console.log(`Leadership: ${r.leadership.style}`);
    console.log(`Communication: ${r.communication.preferredStyle}`);
    console.log(`Decision Making: ${r.decisionMaking.structuredVsExploratory}`);
    console.log(`Career: ${r.careerSuitability.overview}`);
    console.log(`Action Plan 1: ${r.actionPlan[0].action}`);
  }
}

runTests();
