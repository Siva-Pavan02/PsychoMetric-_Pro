export type Trait =
  | "OPENNESS"
  | "CONSCIENTIOUSNESS"
  | "EXTRAVERSION"
  | "AGREEABLENESS"
  | "NEUROTICISM";

export type TraitLevel = "Low" | "Moderate" | "High";

export interface Question {
  id: string;
  text: string;
  trait: Trait;
  reverseScored: boolean;
  order: number;
}

export interface RawResponse {
  questionId: string;
  answer: number; // 1-5
}

export interface TraitScores {
  openness: number;          // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface TraitProfile {
  score: number;
  level: TraitLevel;
}

export interface ScoredProfile {
  openness: TraitProfile;
  conscientiousness: TraitProfile;
  extraversion: TraitProfile;
  agreeableness: TraitProfile;
  neuroticism: TraitProfile;
}

export interface LegacyReportData {
  participantName: string;
  assessmentId: string;
  assessmentDate: string;
  scores: TraitScores;
  profile: ScoredProfile;
  personalityTypeSummary: string;
  overallProfile: string;
  majorStrengths: string[];
  leadershipPotential: string;
  communicationStyle: string;
  decisionMakingStyle: string;
  careerSuitability: string[];
  learningStyle: string;
  stressAndCoping: string;
  motivationalDrivers: string[];
  developmentAreas: string[];
  summary: string;
  recommendations: string[];
  disclaimer: string;
  opennessDescription?: string;
  conscientiousnessDescription?: string;
  extraversionDescription?: string;
  agreeablenessDescription?: string;
  neuroticismDescription?: string;
}

export interface ReportData {
  participantName: string;
  assessmentId: string;
  assessmentDate: string;
  methodology: {
    model: string;
    items: number;
    itemsPerTrait: number;
    scale: string;
    type: string;
    scoring: string;
  };
  scores: TraitScores;
  profile: ScoredProfile;
  scoreLegend: {
    low: string;
    moderate: string;
    high: string;
  };
  profileAtGlance: {
    primaryStrength?: { trait: string; score: number };
    secondaryStrength?: { trait: string; score: number };
    balancedDimensions: { trait: string; score: number }[];
    developmentFocus: { trait: string; score: number }[];
  };
  traitRanking: { trait: string; score: number }[];
  personalityTypeSummary: string;
  overallProfile: string;
  traitInsights: {
    openness: { score: number; level: TraitLevel; meaning: string; implication: string };
    conscientiousness: { score: number; level: TraitLevel; meaning: string; implication: string };
    extraversion: { score: number; level: TraitLevel; meaning: string; implication: string };
    agreeableness: { score: number; level: TraitLevel; meaning: string; implication: string };
    neuroticism: { score: number; level: TraitLevel; meaning: string; implication: string };
  };
  strengths: { strength: string; drivenBy: string }[];
  leadership: { style: string; strengths: string; teamContribution: string; development: string };
  communication: { preferredStyle: string; teamTendency: string; strength: string; blindSpot: string };
  decisionMaking: { structuredVsExploratory: string; speedVsDeliberation: string; peopleConsiderations: string; underUncertainty: string };
  careerSuitability: { overview: string; whyFit: string; roles: string[]; caveat: string };
  learningStyle: { preferredStructure: string; pace: string; feedback: string; practicalVsExploratory: string; independentVsCollaborative: string };
  stressCoping: { sensitivity: string; likelyChallenge: string; helpfulStrategies: string };
  motivationalDrivers: string[];
  developmentAreas: { area: string; whyItMatters: string; practicalGrowth: string }[];
  actionPlan: { action: string; why: string }[];
  summary: string;
  disclaimer: string;
}
