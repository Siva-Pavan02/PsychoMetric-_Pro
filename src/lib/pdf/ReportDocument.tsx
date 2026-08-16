import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";
import { ReportData, LegacyReportData } from "@/types";

const NAVY  = "#1e3a5f";
const SLATE = "#475569";
const LIGHT = "#f8fafc";
const BORDER = "#e2e8f0";

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", backgroundColor: "#fff", paddingHorizontal: 48, paddingVertical: 40 },
  header:      { backgroundColor: NAVY, marginHorizontal: -48, marginTop: -40, paddingHorizontal: 48, paddingVertical: 28, marginBottom: 24 },
  headerTitle: { fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 },
  headerSub:   { fontSize: 11, color: "#94a3b8" },
  
  metaRow:     { flexDirection: "row", gap: 24, marginBottom: 24, flexWrap: "wrap", backgroundColor: LIGHT, padding: 12, borderRadius: 4, borderWidth: 1, borderColor: BORDER },
  metaItem:    { flex: 1, minWidth: 100 },
  metaLabel:   { fontSize: 8, fontWeight: 700, color: SLATE, textTransform: "uppercase", marginBottom: 2 },
  metaValue:   { fontSize: 10, color: "#1e293b", fontWeight: 700 },
  
  section:     { marginBottom: 18 },
  sectionHead: { fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  body:        { lineHeight: 1.5, color: "#334155" },
  
  bullet:      { flexDirection: "row", marginBottom: 4 },
  bulletDot:   { width: 12, color: NAVY, fontWeight: 700 },
  bulletText:  { flex: 1, lineHeight: 1.5, color: "#334155" },
  
  traitRow:    { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  traitLabel:  { width: 130, fontSize: 9, fontWeight: 600, color: "#334155" },
  barBg:       { flex: 1, height: 8, backgroundColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  barFill:     { height: 8, backgroundColor: NAVY, borderRadius: 4 },
  barScore:    { width: 40, textAlign: "right", fontSize: 9, color: SLATE },
  
  badge:       { backgroundColor: LIGHT, borderWidth: 1, borderColor: BORDER, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
  badgeText:   { fontSize: 9, color: "#334155" },
  badgesRow:   { flexDirection: "row", flexWrap: "wrap" },
  
  gridRow:     { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridCol:     { flex: 1, minWidth: "45%" },
  
  insightBox:  { backgroundColor: LIGHT, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  insightHead: { fontSize: 9, fontWeight: 700, color: NAVY, textTransform: "uppercase", marginBottom: 4 },
  
  boldLabel:   { fontWeight: 700, color: SLATE },
  
  disclaimer:  { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: BORDER, fontSize: 8, color: "#94a3b8", lineHeight: 1.5, textAlign: "center" },
  
  recNum:      { width: 18, fontSize: 10, fontWeight: 700, color: NAVY },
  actionText:  { fontSize: 10, fontWeight: 700, color: NAVY, marginBottom: 2 },
  
  methodologyLabel: { fontSize: 8, fontWeight: 700, color: SLATE, textTransform: "uppercase", marginBottom: 1 },
});

function normalizeReport(data: any): ReportData {
  if (data.methodology) return data as ReportData;
  const leg = data as LegacyReportData;
  return {
    participantName: leg.participantName,
    assessmentId: leg.assessmentId,
    assessmentDate: leg.assessmentDate,
    methodology: { model: "Big Five / OCEAN", items: 50, itemsPerTrait: 10, scale: "1-5 Likert", type: "Self-report", scoring: "Deterministic" },
    scores: leg.scores,
    profile: leg.profile,
    scoreLegend: { low: "0-39", moderate: "40-69", high: "70-100" },
    profileAtGlance: { balancedDimensions: [], developmentFocus: [] },
    traitRanking: [
      { trait: "Openness", score: leg.scores.openness },
      { trait: "Conscientiousness", score: leg.scores.conscientiousness },
      { trait: "Extraversion", score: leg.scores.extraversion },
      { trait: "Agreeableness", score: leg.scores.agreeableness },
      { trait: "Neuroticism", score: leg.scores.neuroticism }
    ].sort((a, b) => b.score - a.score),
    personalityTypeSummary: leg.personalityTypeSummary,
    overallProfile: leg.overallProfile,
    traitInsights: {
      openness: { score: leg.scores.openness, level: leg.profile.openness.level, meaning: leg.opennessDescription || "", implication: "" },
      conscientiousness: { score: leg.scores.conscientiousness, level: leg.profile.conscientiousness.level, meaning: leg.conscientiousnessDescription || "", implication: "" },
      extraversion: { score: leg.scores.extraversion, level: leg.profile.extraversion.level, meaning: leg.extraversionDescription || "", implication: "" },
      agreeableness: { score: leg.scores.agreeableness, level: leg.profile.agreeableness.level, meaning: leg.agreeablenessDescription || "", implication: "" },
      neuroticism: { score: leg.scores.neuroticism, level: leg.profile.neuroticism.level, meaning: leg.neuroticismDescription || "", implication: "" }
    },
    strengths: (leg.majorStrengths || []).map(s => ({ strength: s, drivenBy: "" })),
    leadership: { style: leg.leadershipPotential, strengths: "", teamContribution: "", development: "" },
    communication: { preferredStyle: leg.communicationStyle, teamTendency: "", strength: "", blindSpot: "" },
    decisionMaking: { structuredVsExploratory: leg.decisionMakingStyle, speedVsDeliberation: "", peopleConsiderations: "", underUncertainty: "" },
    careerSuitability: { overview: (leg.careerSuitability || []).join(", "), whyFit: "", roles: leg.careerSuitability || [], caveat: "" },
    learningStyle: { preferredStructure: leg.learningStyle, pace: "", feedback: "", practicalVsExploratory: "", independentVsCollaborative: "" },
    stressCoping: { sensitivity: "", likelyChallenge: leg.stressAndCoping, helpfulStrategies: "" },
    motivationalDrivers: leg.motivationalDrivers || [],
    developmentAreas: (leg.developmentAreas || []).map(d => ({ area: d, whyItMatters: "", practicalGrowth: "" })),
    actionPlan: (leg.recommendations || []).map(r => ({ action: r, why: "" })),
    summary: leg.summary,
    disclaimer: leg.disclaimer
  };
}

function Trait({ label, score }: { label: string; score: number }) {
  return (
    <View style={s.traitRow}>
      <Text style={s.traitLabel}>{label}</Text>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${score}%` }]} />
      </View>
      <Text style={s.barScore}>{score}%</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionHead}>{title}</Text>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <>
      {items.map((item, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>•  </Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </>
  );
}

export function ReportDocument({ data: rawData }: { data: any }) {
  const data = normalizeReport(rawData);
  const date = new Date(data.assessmentDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Document title={`Personality Report — ${data.participantName}`} author="PsychoMetric Pro">
      {/* PAGE 1 */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>PsychoMetric Pro</Text>
          <Text style={s.headerSub}>OCEAN Personality Assessment Report</Text>
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}><Text style={s.metaLabel}>Name</Text><Text style={s.metaValue}>{data.participantName}</Text></View>
          <View style={s.metaItem}><Text style={s.metaLabel}>Date</Text><Text style={s.metaValue}>{date}</Text></View>
          <View style={s.metaItem}><Text style={s.metaLabel}>Assessment ID</Text><Text style={s.metaValue}>{data.assessmentId.slice(0, 8).toUpperCase()}</Text></View>
        </View>

        <View style={s.gridRow}>
          <View style={s.gridCol}>
            <Section title="Profile at a Glance">
              {data.profileAtGlance.primaryStrength && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={s.metaLabel}>Primary Strength</Text>
                  <Text style={[s.body, { fontWeight: 700 }]}>{data.profileAtGlance.primaryStrength.trait} ({data.profileAtGlance.primaryStrength.score}%)</Text>
                </View>
              )}
              {data.profileAtGlance.secondaryStrength && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={s.metaLabel}>Secondary Strength</Text>
                  <Text style={[s.body, { fontWeight: 700 }]}>{data.profileAtGlance.secondaryStrength.trait} ({data.profileAtGlance.secondaryStrength.score}%)</Text>
                </View>
              )}
              {data.profileAtGlance.balancedDimensions.length > 0 && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={s.metaLabel}>Balanced Dimensions</Text>
                  <Text style={s.body}>{data.profileAtGlance.balancedDimensions.map(t => `${t.trait}`).join(", ")}</Text>
                </View>
              )}
              {data.profileAtGlance.developmentFocus.length > 0 && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={s.metaLabel}>Development Focus</Text>
                  <Text style={s.body}>{data.profileAtGlance.developmentFocus.map(t => `${t.trait}`).join(", ")}</Text>
                </View>
              )}
            </Section>
          </View>
          <View style={s.gridCol}>
             <Section title="Trait Ranking">
              {data.traitRanking.map((t, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 3 }}>
                  <Text style={{ width: 15, fontWeight: 700, color: SLATE }}>{i + 1}.</Text>
                  <Text style={{ flex: 1, color: "#334155" }}>{t.trait}</Text>
                  <Text style={{ color: SLATE }}>{t.score}%</Text>
                </View>
              ))}
            </Section>
          </View>
        </View>

        <Section title="Personality Trait Scores">
          <Trait label="Openness"          score={data.scores.openness}          />
          <Trait label="Conscientiousness"  score={data.scores.conscientiousness}  />
          <Trait label="Extraversion"       score={data.scores.extraversion}       />
          <Trait label="Agreeableness"      score={data.scores.agreeableness}      />
          <Trait label="Neuroticism"        score={data.scores.neuroticism}        />
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BORDER }}>
            <Text style={{ fontSize: 8, color: SLATE }}>Legend: Low ({data.scoreLegend.low})</Text>
            <Text style={{ fontSize: 8, color: SLATE }}>Moderate ({data.scoreLegend.moderate})</Text>
            <Text style={{ fontSize: 8, color: SLATE }}>High ({data.scoreLegend.high})</Text>
          </View>
        </Section>

        <Section title="Personality Type Summary">
          <Text style={[s.body, { fontWeight: 700 }]}>{data.personalityTypeSummary}</Text>
        </Section>

        <Section title="Overall Personality Profile">
          <Text style={s.body}>{data.overallProfile}</Text>
        </Section>
      </Page>

      {/* PAGE 2 */}
      <Page size="A4" style={s.page}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{data.participantName} — Personality Report (Page 2)</Text>
        </View>

        <Section title="Assessment Methodology">
          <View style={s.gridRow}>
            <View style={{ width: "30%", marginBottom: 6 }}><Text style={s.methodologyLabel}>Model</Text><Text style={s.body}>{data.methodology.model}</Text></View>
            <View style={{ width: "30%", marginBottom: 6 }}><Text style={s.methodologyLabel}>Total Items</Text><Text style={s.body}>{data.methodology.items}</Text></View>
            <View style={{ width: "30%", marginBottom: 6 }}><Text style={s.methodologyLabel}>Items/Trait</Text><Text style={s.body}>{data.methodology.itemsPerTrait}</Text></View>
            <View style={{ width: "30%", marginBottom: 6 }}><Text style={s.methodologyLabel}>Scale</Text><Text style={s.body}>{data.methodology.scale}</Text></View>
            <View style={{ width: "30%", marginBottom: 6 }}><Text style={s.methodologyLabel}>Type</Text><Text style={s.body}>{data.methodology.type}</Text></View>
            <View style={{ width: "30%", marginBottom: 6 }}><Text style={s.methodologyLabel}>Scoring</Text><Text style={s.body}>{data.methodology.scoring}</Text></View>
          </View>
        </Section>

        <Section title="Trait-Level Insights">
          {[
            { t: "Openness", d: data.traitInsights.openness },
            { t: "Conscientiousness", d: data.traitInsights.conscientiousness },
            { t: "Extraversion", d: data.traitInsights.extraversion },
            { t: "Agreeableness", d: data.traitInsights.agreeableness },
            { t: "Neuroticism", d: data.traitInsights.neuroticism },
          ].map(({ t, d }) => (
            <View key={t} style={s.insightBox}>
              <Text style={s.insightHead}>{t} — {d.score}% ({d.level})</Text>
              <Text style={[s.body, { marginBottom: 4 }]}><Text style={s.boldLabel}>Meaning: </Text>{d.meaning}</Text>
              {d.implication && <Text style={s.body}><Text style={s.boldLabel}>Implication: </Text>{d.implication}</Text>}
            </View>
          ))}
        </Section>

        <Section title="Major Strengths">
          {data.strengths.map((st, i) => (
            <View key={i} style={s.bullet}>
              <Text style={s.bulletDot}>•  </Text>
              <Text style={s.bulletText}>
                <Text style={{ fontWeight: 700 }}>{st.strength}</Text>
                {st.drivenBy ? ` (Driven by: ${st.drivenBy})` : ""}
              </Text>
            </View>
          ))}
        </Section>

        <Section title="Leadership Potential">
          <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Style: </Text>{data.leadership.style}</Text>
          {data.leadership.strengths && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Strengths: </Text>{data.leadership.strengths}</Text>}
          {data.leadership.teamContribution && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Team Contribution: </Text>{data.leadership.teamContribution}</Text>}
          {data.leadership.development && <Text style={s.body}><Text style={s.boldLabel}>Development: </Text>{data.leadership.development}</Text>}
        </Section>
      </Page>

      {/* PAGE 3 */}
      <Page size="A4" style={s.page}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{data.participantName} — Personality Report (Page 3)</Text>
        </View>

        <Section title="Communication Style">
          <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Preferred Style: </Text>{data.communication.preferredStyle}</Text>
          {data.communication.teamTendency && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Team Tendency: </Text>{data.communication.teamTendency}</Text>}
          {data.communication.strength && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Strength: </Text>{data.communication.strength}</Text>}
          {data.communication.blindSpot && <Text style={s.body}><Text style={s.boldLabel}>Blind Spot: </Text>{data.communication.blindSpot}</Text>}
        </Section>

        <Section title="Decision-Making Style">
          <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Approach: </Text>{data.decisionMaking.structuredVsExploratory}</Text>
          {data.decisionMaking.speedVsDeliberation && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Pace: </Text>{data.decisionMaking.speedVsDeliberation}</Text>}
          {data.decisionMaking.peopleConsiderations && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>People: </Text>{data.decisionMaking.peopleConsiderations}</Text>}
          {data.decisionMaking.underUncertainty && <Text style={s.body}><Text style={s.boldLabel}>Under Uncertainty: </Text>{data.decisionMaking.underUncertainty}</Text>}
        </Section>

        <Section title="Career Suitability">
          <Text style={[s.body, { marginBottom: 4 }]}><Text style={s.boldLabel}>Environments: </Text>{data.careerSuitability.overview}</Text>
          {data.careerSuitability.whyFit && <Text style={[s.body, { marginBottom: 8 }]}><Text style={s.boldLabel}>Why It Fits: </Text>{data.careerSuitability.whyFit}</Text>}
          
          <Text style={[s.body, s.boldLabel, { marginBottom: 4 }]}>Potentially Compatible Roles:</Text>
          <View style={s.badgesRow}>
            {data.careerSuitability.roles.map((c, i) => (
              <View key={i} style={s.badge}><Text style={s.badgeText}>{c}</Text></View>
            ))}
          </View>
          {data.careerSuitability.caveat && (
             <Text style={{ fontSize: 8, color: SLATE, fontStyle: "italic", marginTop: 4 }}>{data.careerSuitability.caveat}</Text>
          )}
        </Section>

        <Section title="Learning Style">
          <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Structure: </Text>{data.learningStyle.preferredStructure}</Text>
          {data.learningStyle.pace && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Pace: </Text>{data.learningStyle.pace}</Text>}
          {data.learningStyle.feedback && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Feedback: </Text>{data.learningStyle.feedback}</Text>}
          {data.learningStyle.independentVsCollaborative && <Text style={s.body}><Text style={s.boldLabel}>Format: </Text>{data.learningStyle.independentVsCollaborative}</Text>}
        </Section>

        <Section title="Stress & Coping Tendencies">
          <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Sensitivity: </Text>{data.stressCoping.sensitivity || "Moderate"}</Text>
          {data.stressCoping.likelyChallenge && <Text style={[s.body, { marginBottom: 2 }]}><Text style={s.boldLabel}>Likely Challenge: </Text>{data.stressCoping.likelyChallenge}</Text>}
          {data.stressCoping.helpfulStrategies && <Text style={s.body}><Text style={s.boldLabel}>Helpful Strategies: </Text>{data.stressCoping.helpfulStrategies}</Text>}
        </Section>

        <Section title="Motivational Drivers">
          <Bullets items={data.motivationalDrivers} />
        </Section>
      </Page>

      {/* PAGE 4 */}
      <Page size="A4" style={s.page}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{data.participantName} — Personality Report (Page 4)</Text>
        </View>

        <Section title="Development Areas">
          {data.developmentAreas.map((dev, i) => (
             <View key={i} style={{ marginBottom: 8 }}>
               <Text style={[s.body, { fontWeight: 700, color: NAVY, marginBottom: 2 }]}>{dev.area}</Text>
               {dev.whyItMatters && <Text style={s.body}><Text style={s.boldLabel}>Why it matters: </Text>{dev.whyItMatters}</Text>}
               {dev.practicalGrowth && <Text style={s.body}><Text style={s.boldLabel}>Growth direction: </Text>{dev.practicalGrowth}</Text>}
             </View>
          ))}
        </Section>

        <Section title="Personalised Action Plan">
          {data.actionPlan.map((rec, i) => (
            <View key={i} style={[s.bullet, { marginBottom: 8 }]}>
              <Text style={s.recNum}>{i + 1}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.actionText}>{rec.action}</Text>
                {rec.why && <Text style={s.bulletText}>{rec.why}</Text>}
              </View>
            </View>
          ))}
        </Section>

        <Section title="Summary">
          <Text style={s.body}>{data.summary}</Text>
        </Section>

        <Text style={s.disclaimer}>{data.disclaimer}</Text>
      </Page>
    </Document>
  );
}
