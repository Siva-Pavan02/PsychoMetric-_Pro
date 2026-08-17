/**
 * Rule-based personality report interpreter.
 *
 * Thresholds (transparent, documented):
 *   0 – 39  → Low
 *   40 – 69 → Moderate
 *   70 – 100 → High
 *
 * All text is deterministic — no AI. Each block is keyed by
 * the trait level combinations that produce it.
 */

import { TraitScores, ScoredProfile, TraitLevel, TraitProfile, ReportData, RawResponse } from "@/types";

const DISCLAIMER =
  "This assessment is intended for educational, self-development, and personality-awareness purposes only. " +
  "It is not a clinical psychological diagnosis or medical assessment. " +
  "Results reflect self-reported tendencies and should be interpreted as indicative patterns, not absolute classifications. " +
  "Please consult a qualified professional for any occupational psychology or clinical needs.";

function classify(score: number): TraitLevel {
  if (score < 40) return "Low";
  if (score < 70) return "Moderate";
  return "High";
}

function profile(score: number): TraitProfile {
  return { score, level: classify(score) };
}

// ─── Trait Insights ────────────────────────────────────────────────────────

const TRAIT_INSIGHTS = {
  openness: {
    Low: {
      meaning: "A preference for familiar routines, practical thinking, and concrete information over abstract theories.",
      implication: "You may tend to value stability and proven methods when approaching problems.",
    },
    Moderate: {
      meaning: "A balanced openness to experience, appreciating new ideas when they have clear practical value while valuing structure.",
      implication: "You may adapt well to both stable and changing environments, depending on the need.",
    },
    High: {
      meaning: "Strong intellectual curiosity, a rich imagination, and a genuine love of new experiences.",
      implication: "You may tend to seek out novelty, enjoy creative pursuits, and think outside conventional boundaries.",
    }
  },
  conscientiousness: {
    Low: {
      meaning: "A flexible, spontaneous approach to tasks and commitments.",
      implication: "You may tend to adapt plans as situations change, though this can sometimes affect follow-through on deadlines.",
    },
    Moderate: {
      meaning: "A generally reliable and organised approach, balanced with flexibility.",
      implication: "You are capable of focused effort when motivated and tend to meet most commitments.",
    },
    High: {
      meaning: "A strong sense of personal discipline, organisation, and goal-directedness.",
      implication: "You may perform especially well when expectations, deadlines, and responsibilities are clearly defined.",
    }
  },
  extraversion: {
    Low: {
      meaning: "A preference for quieter environments and deeper one-on-one interactions over large social settings.",
      implication: "You may tend to recharge through solitude and often think carefully before speaking.",
    },
    Moderate: {
      meaning: "A comfortable balance between social engagement and personal reflection.",
      implication: "You can work well in teams and independently, adapting your energy to the situation.",
    },
    High: {
      meaning: "A sociable, energetic, and outwardly expressive nature.",
      implication: "You may tend to draw energy from interactions with others and thrive in dynamic, collaborative environments.",
    }
  },
  agreeableness: {
    Low: {
      meaning: "A direct, self-reliant approach to relationships.",
      implication: "You may tend to prioritise task outcomes over interpersonal harmony and are comfortable with conflict when necessary.",
    },
    Moderate: {
      meaning: "A cooperative and considerate approach, balanced with the ability to assert your own views when needed.",
      implication: "You may navigate team dynamics effectively, supporting others while maintaining boundaries.",
    },
    High: {
      meaning: "A warm, empathetic, and cooperative nature.",
      implication: "You may tend to prioritise the needs of others, build strong relationships, and avoid unnecessary conflict.",
    }
  },
  neuroticism: {
    Low: {
      meaning: "Strong emotional stability and resilience.",
      implication: "You may tend to remain calm under pressure, recover quickly from setbacks, and maintain a positive outlook.",
    },
    Moderate: {
      meaning: "A generally stable emotional baseline with some sensitivity to stress in challenging situations.",
      implication: "You are capable of managing emotions effectively in most everyday circumstances.",
    },
    High: {
      meaning: "A heightened sensitivity to stress and a tendency to experience negative emotions more intensely.",
      implication: "You may tend to feel anxious in uncertain situations, though this sensitivity can also drive deep self-awareness.",
    }
  }
};


function deriveResponseQuality(responses: RawResponse[]) {
  if (!responses || responses.length === 0) {
    return { flags: [], valid: true };
  }
  
  const answers = responses.map(r => r.answer);
  const mean = answers.reduce((sum, a) => sum + a, 0) / answers.length;
  const variance = answers.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / answers.length;
  const sd = Math.sqrt(variance);

  const extremes = answers.filter(a => a === 1 || a === 5).length / answers.length;
  const middles = answers.filter(a => a === 3).length / answers.length;

  const flags: string[] = [];
  if (sd < 0.5) flags.push("Low variance detected (potential straight-lining)");
  if (extremes > 0.8) flags.push("Unusually high rate of extreme responses (1 or 5)");
  if (middles > 0.8) flags.push("Unusually high rate of neutral responses (3)");

  return { flags, valid: true };
}

// ─── Multi-trait derived sections ─────────────────────────────────────────

function derivePersonalityTypeSummary(p: ScoredProfile): string {
  const { openness: O, conscientiousness: C, extraversion: E, agreeableness: A, neuroticism: N } = p;

  if (O.level === "High" && C.level === "High" && E.level === "High")
    return "The Driven Innovator — you combine curiosity, discipline, and social energy to lead change and inspire others.";
  if (O.level === "High" && C.level === "High" && E.level !== "High")
    return "The Thoughtful Strategist — you bring deep thinking and disciplined execution, often working best independently or in small trusted teams.";
  if (C.level === "High" && A.level === "High" && E.level !== "High")
    return "The Reliable Collaborator — dependable, warm, and thorough; you are the person teams trust to deliver and support others.";
  if (E.level === "High" && A.level === "High" && O.level !== "High")
    return "The People Champion — your warmth and outgoing nature make you a natural relationship-builder and team motivator.";
  if (N.level === "High" && O.level === "High")
    return "The Sensitive Creative — your depth of feeling and imagination drive strong creative and empathetic work, though managing stress is a key development area.";
  if (C.level === "Low" && O.level === "High" && E.level === "High")
    return "The Spontaneous Explorer — energetic and ideas-driven, you thrive in dynamic environments though structured planning can amplify your impact.";
  if (C.level === "High" && O.level === "Low")
    return "The Pragmatic Executor — you deliver reliable, practical results and excel in roles with clear processes and defined goals.";
  if (A.level === "Low" && C.level === "High")
    return "The Results-Focused Leader — direct, disciplined, and outcome-oriented; you lead decisively and hold high standards for yourself and others.";
  return "The Balanced Professional — your personality profile reflects a well-rounded mix of traits, giving you adaptability across a variety of roles and environments.";
}

function deriveOverallProfile(p: ScoredProfile): string {
  const { openness: O, conscientiousness: C, extraversion: E, agreeableness: A } = p;
  
  if (C.level === "High" && A.level === "High") {
    return "High Conscientiousness and High Agreeableness suggest a highly dependable, cooperative working style. You may excel in environments that require careful execution combined with strong team alignment. However, you may occasionally struggle to say no or assert boundaries when tasks become overwhelming.";
  }
  if (O.level === "High" && E.level === "High") {
    return "High Openness combined with High Extraversion suggests a dynamic, ideas-driven approach to the world. You likely thrive in fast-paced, collaborative environments where innovation is valued. A potential trade-off is that highly structured, repetitive tasks may quickly drain your energy.";
  }
  if (C.level === "High" && O.level === "High") {
    return "High Conscientiousness paired with High Openness indicates a structured approach to innovation. You are likely capable of generating novel ideas and actually following through on them systematically. You may occasionally face challenges when forced to operate in highly bureaucratic or rigid environments.";
  }
  if (E.level === "Low" && A.level === "High") {
    return "Low Extraversion combined with High Agreeableness suggests a thoughtful, supportive, and understated presence. You likely build deep, meaningful relationships rather than broad networks. You may need to consciously practice self-advocacy so your contributions are not overlooked.";
  }
  
  return "Your profile is characterised by moderate balance across multiple dimensions. This suggests a versatile behavioural pattern, allowing you to adapt to both structured and unstructured environments as the situation demands. Your main challenge may be identifying which of your flexible skills to specialize in over time.";
}

function deriveStrengths(p: ScoredProfile) {
  const strengths = [];
  if (p.conscientiousness.level === "High") strengths.push({ strength: "Reliable Execution", drivenBy: "High Conscientiousness", tradeOff: "May over-index on process over speed" });
  if (p.agreeableness.level === "High") strengths.push({ strength: "Relationship Building", drivenBy: "High Agreeableness", tradeOff: "May occasionally avoid necessary conflict" });
  if (p.extraversion.level === "High") strengths.push({ strength: "Persuasive Communication", drivenBy: "High Extraversion", tradeOff: "May sometimes dominate conversations" });
  if (p.openness.level === "High") strengths.push({ strength: "Creative Problem Solving", drivenBy: "High Openness", tradeOff: "May struggle with highly repetitive execution" });
  if (p.neuroticism.level === "Low") strengths.push({ strength: "Emotional Resilience", drivenBy: "Low Neuroticism", tradeOff: "May underestimate the stress others are feeling" });
  
  if (strengths.length < 3) {
    strengths.push({ strength: "Adaptability", drivenBy: "Balanced Profile" });
    strengths.push({ strength: "Balanced Judgement", drivenBy: "Moderate Trait Variance" });
    strengths.push({ strength: "Situational Awareness", drivenBy: "Flexible Disposition" });
  }
  return strengths.slice(0, 5);
}

function deriveLeadership(p: ScoredProfile) {
  const { extraversion: E, conscientiousness: C, agreeableness: A, openness: O } = p;

  if (E.level === "High" && C.level === "High") {
    return {
      style: "Driven & Outward-Facing",
      strengths: "You combine social confidence with disciplined follow-through.",
      teamContribution: "You naturally organise others and set a clear, energetic pace.",
      development: "Ensure you leave room for quieter team members to voice their ideas.",
      drivenByScores: "High Extraversion + High Conscientiousness"
    };
  }
  if (A.level === "High" && E.level !== "Low") {
    return {
      style: "Collaborative & Supportive",
      strengths: "You inspire trust, build consensus, and bring teams together.",
      teamContribution: "You create high psychological safety where teams feel valued.",
      development: "Practice delivering critical feedback directly, even if it feels uncomfortable.",
      drivenByScores: "High Agreeableness + Moderate/High Extraversion"
    };
  }
  if (C.level === "High" && O.level === "High" && E.level !== "High") {
    return {
      style: "Thoughtful & Strategic",
      strengths: "You lead through expertise, careful planning, and intellectual depth.",
      teamContribution: "You provide teams with clear, well-reasoned direction.",
      development: "Work on communicating your vision more overtly to build early buy-in.",
      drivenByScores: "High Conscientiousness + High Openness"
    };
  }
  if (C.level === "High" && E.level !== "High") {
    return {
      style: "Functional & Dependable",
      strengths: "You lead by example through reliability and consistent output.",
      teamContribution: "You ensure standards are met and processes run smoothly.",
      development: "Practice delegating tasks rather than taking them on yourself.",
      drivenByScores: "High Conscientiousness + Low/Moderate Extraversion"
    };
  }
  
  return {
    style: "Adaptive & Contextual",
    strengths: "You adjust your leadership approach based on the specific situation.",
    teamContribution: "You can step up when needed or follow when appropriate.",
    development: "Identify a consistent personal leadership philosophy to anchor your decisions.",
    drivenByScores: "Balanced / Mixed Trait Profile"
  };
}

function deriveCommunication(p: ScoredProfile) {
  const { extraversion: E, agreeableness: A, openness: O } = p;

  if (E.level === "High" && A.level === "High") {
    return {
      preferredStyle: "Expressive and warm",
      teamTendency: "You tend to build rapport easily and adapt your message to your audience.",
      strength: "You naturally navigate social nuances and build trust quickly.",
      blindSpot: "You might sometimes avoid difficult conversations to maintain harmony.",
      drivenByScores: "High Extraversion + High Agreeableness"
    };
  }
  if (E.level === "High" && A.level !== "High") {
    return {
      preferredStyle: "Direct and assertive",
      teamTendency: "You are comfortable voicing your views and prefer clear, efficient exchanges.",
      strength: "You bring clarity to ambiguous situations by speaking plainly.",
      blindSpot: "Your directness might occasionally be perceived as bluntness.",
      drivenByScores: "High Extraversion + Low/Moderate Agreeableness"
    };
  }
  if (E.level === "Low" && A.level === "High") {
    return {
      preferredStyle: "Thoughtful and attentive",
      teamTendency: "You listen with genuine care and prefer meaningful dialogue over small talk.",
      strength: "You make others feel truly heard and understood.",
      blindSpot: "You may hesitate to interrupt, causing your own ideas to be overlooked.",
      drivenByScores: "Low Extraversion + High Agreeableness"
    };
  }
  if (E.level === "Low" && O.level === "High") {
    return {
      preferredStyle: "Analytical and idea-driven",
      teamTendency: "You communicate through precise, rich content rather than social chatter.",
      strength: "You articulate complex concepts very clearly.",
      blindSpot: "You might over-explain the theory when practical instructions are needed.",
      drivenByScores: "Low Extraversion + High Openness"
    };
  }
  return {
    preferredStyle: "Flexible and situational",
    teamTendency: "You adapt your communication based on the needs of the group.",
    strength: "You can mediate between different communication styles effectively.",
    blindSpot: "Your true opinions may sometimes be hard to read.",
    drivenByScores: "Balanced / Contextual Profile"
  };
}

function deriveDecisionMaking(p: ScoredProfile) {
  const { conscientiousness: C, openness: O, neuroticism: N } = p;

  if (C.level === "High" && O.level === "Low") {
    return {
      structuredVsExploratory: "Highly structured and systematic.",
      speedVsDeliberation: "Deliberate; prefers gathering complete information before committing.",
      peopleConsiderations: "Focuses heavily on objective facts and process.",
      underUncertainty: "May feel frustrated without clear precedents or data.",
      drivenByScores: "High Conscientiousness + Low Openness"
    };
  }
  if (O.level === "High" && C.level !== "High") {
    return {
      structuredVsExploratory: "Intuitive and exploratory.",
      speedVsDeliberation: "Can move quickly when an idea feels right.",
      peopleConsiderations: "Weighs novel possibilities over established rules.",
      underUncertainty: "Comfortable trusting instincts when exploring novel options.",
      drivenByScores: "High Openness + Low/Moderate Conscientiousness"
    };
  }
  if (C.level === "High" && O.level === "High") {
    return {
      structuredVsExploratory: "Balanced: analytical yet open to unconventional approaches.",
      speedVsDeliberation: "Takes time to rigorously evaluate creative options.",
      peopleConsiderations: "Seeks the optimal path that satisfies both logic and vision.",
      underUncertainty: "Works systematically to reduce uncertainty through research.",
      drivenByScores: "High Conscientiousness + High Openness"
    };
  }
  if (N.level === "High") {
    return {
      structuredVsExploratory: "Cautious and risk-aware.",
      speedVsDeliberation: "Often deliberates extensively to avoid mistakes.",
      peopleConsiderations: "May seek consensus to share the burden of the decision.",
      underUncertainty: "High-stakes decisions can feel stressful without trusted sounding boards.",
      drivenByScores: "High Neuroticism"
    };
  }
  return {
    structuredVsExploratory: "Pragmatic and situational.",
    speedVsDeliberation: "Adapts speed to the context and time available.",
    peopleConsiderations: "Balances facts with stakeholder needs reasonably well.",
    underUncertainty: "Tolerates ambiguity effectively when stakes are moderate.",
    drivenByScores: "Balanced / Mixed Trait Profile"
  };
}

function deriveCareerSuitability(p: ScoredProfile) {
  const { openness: O, conscientiousness: C, extraversion: E, agreeableness: A } = p;
  
  if (O.level === "High" && E.level === "High") {
    return {
      overview: "Dynamic, fast-paced environments that reward innovation and social engagement.",
      whyFit: "Your profile suggests you draw energy from collaborating on new ideas and driving change.",
      roles: ["Innovation Leadership", "Marketing Strategy", "Entrepreneurship", "Creative Direction"],
      caveat: "Personality tendencies alone should not determine career choice. Consider your actual skills and interests.",
      drivenByScores: "High Openness + High Extraversion"
    };
  }
  if (C.level === "High" && A.level === "High") {
    return {
      overview: "Structured, people-oriented environments that require reliability and empathy.",
      whyFit: "Your profile suggests you excel at executing processes that directly support or help others.",
      roles: ["Healthcare Administration", "Education", "Human Resources", "Social Work"],
      caveat: "Personality tendencies alone should not determine career choice. Consider your actual skills and interests.",
      drivenByScores: "High Conscientiousness + High Agreeableness"
    };
  }
  if (C.level === "High" && O.level === "Low") {
    return {
      overview: "Stable, process-driven environments with clear metrics for success.",
      whyFit: "Your profile suggests you thrive on predictability, accuracy, and rigorous execution.",
      roles: ["Operations", "Finance & Accounting", "Quality Assurance", "Logistics"],
      caveat: "Personality tendencies alone should not determine career choice. Consider your actual skills and interests.",
      drivenByScores: "High Conscientiousness + Low Openness"
    };
  }
  if (O.level === "High" && C.level === "High") {
    return {
      overview: "Complex, analytical environments requiring both deep thought and strict execution.",
      whyFit: "Your profile suggests you can design novel solutions and successfully see them through to completion.",
      roles: ["Engineering", "Research & Development", "Strategic Consulting", "Product Management"],
      caveat: "Personality tendencies alone should not determine career choice. Consider your actual skills and interests.",
      drivenByScores: "High Openness + High Conscientiousness"
    };
  }
  return {
    overview: "Cross-functional environments that require versatility.",
    whyFit: "Your balanced profile suggests you can adapt to a variety of roles without feeling strictly confined to one mode of working.",
    roles: ["Project Management", "General Management", "Account Management", "Customer Success"],
    caveat: "Personality tendencies alone should not determine career choice. Consider your actual skills and interests.",
    drivenByScores: "Balanced / Generalist Profile"
  };
}

function deriveLearningStyle(p: ScoredProfile) {
  const { openness: O, conscientiousness: C, extraversion: E } = p;

  if (O.level === "High" && E.level === "High") {
    return {
      preferredStructure: "Flexible and interactive.",
      pace: "Fast-paced, driven by curiosity.",
      feedback: "Enjoys lively debate and peer feedback.",
      practicalVsExploratory: "Highly exploratory.",
      independentVsCollaborative: "Collaborative; learns best through discussion and workshops."
    };
  }
  if (O.level === "High" && E.level !== "High") {
    return {
      preferredStructure: "Self-directed and deep.",
      pace: "Variable, spending hours on interesting tangents.",
      feedback: "Prefers written, expert feedback.",
      practicalVsExploratory: "Exploratory and theoretical.",
      independentVsCollaborative: "Independent; learns best through reading and research."
    };
  }
  if (C.level === "High" && O.level !== "High") {
    return {
      preferredStructure: "Highly structured with clear syllabi.",
      pace: "Steady and disciplined.",
      feedback: "Prefers clear rubrics and actionable corrections.",
      practicalVsExploratory: "Highly practical; wants to apply learning immediately.",
      independentVsCollaborative: "Can do either, so long as the group is equally disciplined."
    };
  }
  if (E.level === "High" && O.level !== "High") {
    return {
      preferredStructure: "Social and experiential.",
      pace: "Energetic and hands-on.",
      feedback: "Prefers immediate, verbal coaching.",
      practicalVsExploratory: "Practical and applied.",
      independentVsCollaborative: "Highly collaborative; learns best through role-play and practice."
    };
  }
  return {
    preferredStructure: "Versatile; adapts to the course format.",
    pace: "Moderate and consistent.",
    feedback: "Appreciates standard, constructive feedback.",
    practicalVsExploratory: "Balances theory with practice.",
    independentVsCollaborative: "Comfortable studying alone or in study groups."
  };
}

function deriveStressCoping(p: ScoredProfile) {
  const { neuroticism: N, conscientiousness: C, extraversion: E } = p;

  if (N.level === "Low") {
    return {
      sensitivity: "Low",
      likelyChallenge: "You may occasionally underestimate the emotional impact of stress on others.",
      helpfulStrategies: "You generally maintain composure easily. Ensure you proactively check in on team members during crises."
    };
  }
  if (N.level === "High" && C.level === "High") {
    return {
      sensitivity: "High",
      likelyChallenge: "You may experience significant stress but mask it by over-working or hyper-organising.",
      helpfulStrategies: "Your discipline is an asset. Use it to schedule mandatory downtime and enforce strict work boundaries."
    };
  }
  if (N.level === "High" && E.level === "High") {
    return {
      sensitivity: "High",
      likelyChallenge: "You may feel overwhelmed and outwardly express anxiety to those around you.",
      helpfulStrategies: "Social support is your best tool. Talking through problems with trusted peers helps you process pressure effectively."
    };
  }
  if (N.level === "High") {
    return {
      sensitivity: "High",
      likelyChallenge: "A tendency towards emotional reactivity and worry in uncertain situations.",
      helpfulStrategies: "Developing mindfulness practices, structured routines, and strong support networks will help manage pressure."
    };
  }
  return {
    sensitivity: "Moderate",
    likelyChallenge: "Prolonged periods of high pressure may eventually drain your reserves.",
    helpfulStrategies: "Proactive self-care and clear personal boundaries generally keep you functioning well."
  };
}

function deriveMotivationalDrivers(p: ScoredProfile) {
  const { openness: O, conscientiousness: C, extraversion: E, agreeableness: A } = p;
  const drivers: string[] = [];

  if (O.level === "High") drivers.push("Intellectual stimulation and novelty");
  if (C.level === "High") drivers.push("Achievement, mastery, and measurable progress");
  if (E.level === "High") drivers.push("Recognition, collaboration, and social connection");
  if (A.level === "High") drivers.push("Purpose, helping others, and positive impact");
  if (O.level === "Low" && C.level === "High") drivers.push("Stability, security, and clear outcomes");
  if (drivers.length < 2) drivers.push("Autonomy and self-directed growth");

  return drivers.slice(0, 4);
}

function deriveDevelopmentAreas(p: ScoredProfile) {
  const areas = [];
  if (p.conscientiousness.level === "Low") {
    areas.push({
      area: "Consistency and Follow-Through",
      whyItMatters: "Spontaneity is great, but dropped commitments can erode trust over time.",
      practicalGrowth: "Focus on capturing all tasks in a reliable system rather than relying on memory."
    });
  }
  if (p.neuroticism.level === "High") {
    areas.push({
      area: "Stress Regulation",
      whyItMatters: "High sensitivity can lead to burnout if not managed proactively.",
      practicalGrowth: "Practice inserting a 'pause' between feeling a stressor and reacting to it."
    });
  }
  if (p.agreeableness.level === "Low") {
    areas.push({
      area: "Collaborative Tact",
      whyItMatters: "Directness solves problems, but excessive bluntness can damage necessary relationships.",
      practicalGrowth: "Practice validating the other person's perspective before disagreeing."
    });
  }
  if (p.extraversion.level === "Low") {
    areas.push({
      area: "Self-Advocacy",
      whyItMatters: "Quiet diligence often goes unnoticed in competitive environments.",
      practicalGrowth: "Identify one regular meeting where you commit to speaking up early."
    });
  }
  if (p.openness.level === "Low") {
    areas.push({
      area: "Adaptability to Change",
      whyItMatters: "Over-reliance on proven methods can cause you to miss necessary innovations.",
      practicalGrowth: "When presented with a new tool or process, commit to a trial period before rejecting it."
    });
  }
  if (areas.length === 0) {
    areas.push({
      area: "Deepening Specialisation",
      whyItMatters: "A balanced profile means you are good at many things, but perhaps lack a singular standout trait.",
      practicalGrowth: "Identify the one skill that brings you the most energy and deliberately over-invest in it."
    });
  }
  return areas.slice(0, 3);
}

function deriveRecommendations(p: ScoredProfile) {
  const recs = [];

  if (p.neuroticism.level === "High" && p.conscientiousness.level === "High") {
    recs.push({
      action: "Schedule Mandatory Disconnect Time",
      why: "Because you are highly disciplined but prone to stress, you must apply your discipline to resting. Without it, you risk burnout."
    });
  } else if (p.neuroticism.level === "High") {
    recs.push({
      action: "Implement a Daily Grounding Routine",
      why: "A 10-minute mindfulness or journaling habit helps build emotional awareness and reduces reactive stress responses."
    });
  }

  if (p.conscientiousness.level === "Low") {
    recs.push({
      action: "Conduct a Weekly 'Top 3' Review",
      why: "Introduce a planning session every Sunday to prioritise just the top 3 commitments for the week. This builds consistency without overwhelming your need for flexibility."
    });
  }
  
  if (p.extraversion.level === "Low" && p.agreeableness.level !== "High") {
    recs.push({
      action: "Set a Micro-Networking Target",
      why: "Seek one low-stakes collaborative activity per month. Progressive exposure builds comfort in professional settings."
    });
  }
  
  if (p.openness.level === "Low") {
    recs.push({
      action: "Deliberate Novelty Exposure",
      why: "Commit to one new experience per month—a book from an unfamiliar genre or a new software tool—to keep your adaptability sharp."
    });
  }
  
  if (p.agreeableness.level === "Low") {
    recs.push({
      action: "Practice 'Pause-Listen-Respond'",
      why: "When in disagreement, force a pause before reacting. Actively listen to the other view, acknowledge it out loud, then state your case."
    });
  }
  
  if (p.conscientiousness.level === "High" && p.agreeableness.level === "High") {
    recs.push({
      action: "Audit Your Commitments",
      why: "Your combination of high reliability and high empathy means you likely take on too much. Practice saying 'no' to one minor request this week."
    });
  }

  if (p.openness.level === "High" && p.conscientiousness.level !== "High") {
    recs.push({
      action: "Apply the 'Finish It' Rule",
      why: "Channel your creativity into a side project, but enforce a strict 30-day deadline. This builds delivery habits alongside your natural ideation."
    });
  }

  // Ensure 3-5
  if (recs.length < 3) {
    recs.push({
      action: "Establish a Feedback Loop",
      why: "Seek regular feedback from a trusted colleague or mentor to surface blind spots and validate your self-perception."
    });
  }
  if (recs.length < 3) {
    recs.push({
      action: "Define a 90-Day Growth Objective",
      why: "Set a personal development goal tied to your career aspirations, review progress monthly, and adjust based on evidence."
    });
  }
  if (recs.length < 3) {
    recs.push({
      action: "Cross-Train a Skill",
      why: "Spend two hours a week learning a skill outside your primary domain to capitalise on your balanced profile."
    });
  }

  return recs.slice(0, 5);
}

function deriveSummary(p: ScoredProfile, name: string): string {
  const dominant = ([
    ["Openness", p.openness.score],
    ["Conscientiousness", p.conscientiousness.score],
    ["Extraversion", p.extraversion.score],
    ["Agreeableness", p.agreeableness.score],
    ["Neuroticism", p.neuroticism.score],
  ] as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([t]) => t)
    .join(" and ");

  return `${name}'s profile indicates strongest behavioural tendencies in ${dominant}. ` +
    `These insights suggest predictable patterns in how they work, lead, and communicate. ` +
    `However, personality is not fixed; awareness of these natural inclinations is the first step toward intentional growth and adaptive behaviour.`;
}

// ─── Main interpreter ──────────────────────────────────────────────────────

export function interpretScores(
  scores: TraitScores,
  responses: RawResponse[],
  participantName: string,
  assessmentId: string,
  assessmentDate: string
): ReportData {
  const p: ScoredProfile = {
    openness:          profile(scores.openness),
    conscientiousness: profile(scores.conscientiousness),
    extraversion:      profile(scores.extraversion),
    agreeableness:     profile(scores.agreeableness),
    neuroticism:       profile(scores.neuroticism),
  };

  const traitArray = [
    { trait: "Openness", score: scores.openness },
    { trait: "Conscientiousness", score: scores.conscientiousness },
    { trait: "Extraversion", score: scores.extraversion },
    { trait: "Agreeableness", score: scores.agreeableness },
    { trait: "Neuroticism", score: scores.neuroticism }
  ];
  
  // Sort descending by score. On tie, maintain relative order to avoid instability.
  traitArray.sort((a, b) => b.score - a.score);

  const primaryStrength = traitArray[0];
  const secondaryStrength = traitArray[1];
  const developmentFocus = traitArray.filter(t => t.score < 40);
  const balancedDimensions = traitArray.filter(t => t.score >= 40 && t.score < 70);

  return {
    participantName,
    assessmentId,
    assessmentDate,
    
    methodology: {
      model: "Big Five / OCEAN",
      items: 50,
      itemsPerTrait: 10,
      scale: "1–5 Likert Scale",
      type: "Self-report",
      scoring: "Deterministic trait aggregation and normalization",
      limitations: [
        "Self-report tendencies without normative comparisons (not a clinical assessment)",
        "State vs Trait variance (responses may reflect current mood)",
        "Lack of behavioral verification (reflects self-perception, not peer-rated performance)"
      ]
    },
    
    responseQuality: deriveResponseQuality(responses),

    scores,
    profile: p,

    scoreLegend: {
      low: "0–39",
      moderate: "40–69",
      high: "70–100"
    },

    profileAtGlance: {
      primaryStrength: primaryStrength.score >= 70 ? primaryStrength : undefined,
      secondaryStrength: secondaryStrength.score >= 70 ? secondaryStrength : undefined,
      balancedDimensions,
      developmentFocus
    },

    traitRanking: traitArray,

    personalityTypeSummary: derivePersonalityTypeSummary(p),
    overallProfile:         deriveOverallProfile(p),

    traitInsights: {
      openness: { score: scores.openness, level: p.openness.level, meaning: TRAIT_INSIGHTS.openness[p.openness.level].meaning, implication: TRAIT_INSIGHTS.openness[p.openness.level].implication },
      conscientiousness: { score: scores.conscientiousness, level: p.conscientiousness.level, meaning: TRAIT_INSIGHTS.conscientiousness[p.conscientiousness.level].meaning, implication: TRAIT_INSIGHTS.conscientiousness[p.conscientiousness.level].implication },
      extraversion: { score: scores.extraversion, level: p.extraversion.level, meaning: TRAIT_INSIGHTS.extraversion[p.extraversion.level].meaning, implication: TRAIT_INSIGHTS.extraversion[p.extraversion.level].implication },
      agreeableness: { score: scores.agreeableness, level: p.agreeableness.level, meaning: TRAIT_INSIGHTS.agreeableness[p.agreeableness.level].meaning, implication: TRAIT_INSIGHTS.agreeableness[p.agreeableness.level].implication },
      neuroticism: { score: scores.neuroticism, level: p.neuroticism.level, meaning: TRAIT_INSIGHTS.neuroticism[p.neuroticism.level].meaning, implication: TRAIT_INSIGHTS.neuroticism[p.neuroticism.level].implication }
    },

    strengths:              deriveStrengths(p),
    leadership:             deriveLeadership(p),
    communication:          deriveCommunication(p),
    decisionMaking:         deriveDecisionMaking(p),
    careerSuitability:      deriveCareerSuitability(p),
    learningStyle:          deriveLearningStyle(p),
    stressCoping:           deriveStressCoping(p),
    motivationalDrivers:    deriveMotivationalDrivers(p),
    developmentAreas:       deriveDevelopmentAreas(p),
    actionPlan:             deriveRecommendations(p),
    summary:                deriveSummary(p, participantName),
    disclaimer:             DISCLAIMER
  };
}
