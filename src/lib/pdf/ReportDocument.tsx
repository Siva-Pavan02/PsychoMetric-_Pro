import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font
} from "@react-pdf/renderer";
import { ReportData, LegacyReportData } from "@/types";
import { formatDate } from "@/lib/utils/date";

// Note: React-PDF has limited built-in fonts. We use Helvetica (built-in).
const NAVY  = "#10233d";
const TEAL  = "#2b7a78";
const SLATE = "#475569";
const LIGHT = "#f4f7f9";
const BORDER = "#e2e8f0";

export const PDF_TEMPLATE_VERSION = "v1";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#1e293b", backgroundColor: "#fff", padding: 40, paddingBottom: 60 },
  
  // Header / Footer
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerBrand: { fontSize: 14, fontWeight: 700, color: NAVY, letterSpacing: -0.5 },
  headerTitle: { fontSize: 9, color: SLATE, textTransform: "uppercase", letterSpacing: 1 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 },
  footerText: { fontSize: 8, color: "#94a3b8" },

  // Typography
  h1: { fontSize: 24, fontWeight: 700, color: NAVY, marginBottom: 24, letterSpacing: -0.5 },
  h2: { fontSize: 14, fontWeight: 700, color: NAVY, marginTop: 16, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  h3: { fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 6 },
  body: { fontSize: 10, lineHeight: 1.6, color: "#334155", marginBottom: 8 },
  bold: { fontWeight: 700 },
  italic: { fontStyle: "italic" },
  
  // Provenance
  provenance: { fontSize: 8, color: SLATE, fontStyle: "italic", marginTop: 4, padding: 6, backgroundColor: LIGHT, borderRadius: 4 },

  // Meta Box (Page 1)
  metaContainer: { backgroundColor: LIGHT, padding: 20, borderRadius: 8, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: TEAL },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  metaItem: { minWidth: "45%", marginBottom: 12 },
  metaLabel: { fontSize: 8, fontWeight: 700, color: SLATE, textTransform: "uppercase", marginBottom: 4, letterSpacing: 0.5 },
  metaValue: { fontSize: 12, fontWeight: 700, color: NAVY },
  
  // Quality Notice
  qualityBox: { backgroundColor: "#fef2f2", padding: 16, borderRadius: 8, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: "#dc2626" },
  qualityTitle: { fontSize: 10, fontWeight: 700, color: "#991b1b", marginBottom: 6, textTransform: "uppercase" },
  qualityText: { fontSize: 9, color: "#b91c1c", marginBottom: 2 },

  // Cards
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 8, borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
  cardLight: { backgroundColor: LIGHT, padding: 16, borderRadius: 8, marginBottom: 16 },
  
  // Trait Visualization
  oceanRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, padding: 12, backgroundColor: LIGHT, borderRadius: 8 },
  oceanLabelBox: { width: "30%" },
  oceanTraitName: { fontSize: 11, fontWeight: 700, color: NAVY, marginBottom: 2 },
  oceanTraitLevel: { fontSize: 9, color: TEAL, fontWeight: 700, textTransform: "uppercase" },
  oceanBarWrap: { flex: 1, marginHorizontal: 16, height: 6, backgroundColor: "#cbd5e1", borderRadius: 3, position: "relative" },
  oceanBarFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: TEAL, borderRadius: 3 },
  oceanScoreBox: { width: 30, alignItems: "flex-end" },
  oceanScore: { fontSize: 12, fontWeight: 700, color: NAVY },

  // Insight Cards
  insightCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 8 },
  insightHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  insightScoreBadge: { backgroundColor: TEAL, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, color: "#fff", fontSize: 9, fontWeight: 700 },
  
  // Bullets
  bulletRow: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { width: 12, fontSize: 10, color: TEAL, fontWeight: 700 },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.5, color: "#334155" },

  // Action Steps
  actionCard: { flexDirection: "row", padding: 16, backgroundColor: LIGHT, borderRadius: 8, marginBottom: 12 },
  actionNum: { fontSize: 24, fontWeight: 700, color: TEAL, width: 40, opacity: 0.5 },
  actionContent: { flex: 1 },

  // Tags
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 8 },
  tag: { backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4, color: "#fff", fontSize: 9 },

  // 2-col Grid
  grid: { flexDirection: "row", gap: 20 },
  col: { flex: 1 }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeReport(data: any): ReportData {
  if (data.methodology) return data as ReportData;
  const leg = data as LegacyReportData;
  return {
    participantName: leg.participantName,
    assessmentId: leg.assessmentId,
    assessmentDate: leg.assessmentDate,
    methodology: { model: "Big Five / OCEAN", items: 50, itemsPerTrait: 10, scale: "1-5 Likert", type: "Self-report", scoring: "Deterministic", limitations: [] },
    responseQuality: { flags: [], valid: true },
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
    strengths: (leg.majorStrengths || []).map(s => ({ strength: s, drivenBy: "", tradeOff: "" })),
    leadership: { style: leg.leadershipPotential, strengths: "", teamContribution: "", development: "", drivenByScores: "" },
    communication: { preferredStyle: leg.communicationStyle, teamTendency: "", strength: "", blindSpot: "", drivenByScores: "" },
    decisionMaking: { structuredVsExploratory: leg.decisionMakingStyle, speedVsDeliberation: "", peopleConsiderations: "", underUncertainty: "", drivenByScores: "" },
    careerSuitability: { overview: (leg.careerSuitability || []).join(", "), whyFit: "", roles: leg.careerSuitability || [], caveat: "", drivenByScores: "" },
    learningStyle: { preferredStructure: leg.learningStyle, pace: "", feedback: "", practicalVsExploratory: "", independentVsCollaborative: "" },
    stressCoping: { sensitivity: "", likelyChallenge: leg.stressAndCoping, helpfulStrategies: "" },
    motivationalDrivers: leg.motivationalDrivers || [],
    developmentAreas: (leg.developmentAreas || []).map(d => ({ area: d, whyItMatters: "", practicalGrowth: "" })),
    actionPlan: (leg.recommendations || []).map(r => ({ action: r, why: "" })),
    summary: leg.summary,
    disclaimer: leg.disclaimer
  };
}

const Header = () => (
  <View style={s.headerRow} fixed>
    <Text style={s.headerBrand}>PsychoMetric Pro</Text>
    <Text style={s.headerTitle}>Personality Assessment Report</Text>
  </View>
);

const Footer = ({ pageNum, total }: { pageNum: number, total: number }) => (
  <View style={s.footer} fixed>
    <Text style={s.footerText}>Strictly Confidential</Text>
    <Text style={s.footerText}>Page {pageNum} of {total}</Text>
  </View>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReportDocument({ data: rawData }: { data: any }) {
  const data = normalizeReport(rawData);
  const date = formatDate(data.assessmentDate);
  const idShort = data.assessmentId.slice(0, 8).toUpperCase();

  return (
    <Document title={`Personality Report — ${data.participantName}`} author="PsychoMetric Pro">
      
      {/* PAGE 1: EXECUTIVE SUMMARY */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.h1}>Executive Summary</Text>
        
        <View style={s.metaContainer}>
          <View style={s.metaRow}>
            <View style={s.metaItem}><Text style={s.metaLabel}>Participant Name</Text><Text style={s.metaValue}>{data.participantName}</Text></View>
            <View style={s.metaItem}><Text style={s.metaLabel}>Assessment Date</Text><Text style={s.metaValue}>{date}</Text></View>
            <View style={s.metaItem}><Text style={s.metaLabel}>Reference ID</Text><Text style={s.metaValue}>{idShort}</Text></View>
            <View style={s.metaItem}><Text style={s.metaLabel}>Primary Identity</Text><Text style={s.metaValue}>{data.personalityTypeSummary}</Text></View>
          </View>
        </View>

        {data.responseQuality?.flags?.length > 0 && (
          <View style={s.qualityBox}>
            <Text style={s.qualityTitle}>Response Quality Notice</Text>
            {data.responseQuality.flags.map((f, i) => (
              <Text key={i} style={s.qualityText}>• {f}</Text>
            ))}
          </View>
        )}

        <View style={s.grid}>
          <View style={s.col}>
            <Text style={s.h2}>Profile at a Glance</Text>
            <Text style={s.body}>{data.overallProfile}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.h2}>Dominant Traits</Text>
            <View style={s.cardLight}>
              {data.traitRanking.slice(0, 3).map((t, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 6 }}>
                  <Text style={{ width: 20, color: TEAL, fontWeight: 700 }}>0{i+1}</Text>
                  <Text style={{ flex: 1, fontWeight: 700, color: NAVY }}>{t.trait}</Text>
                  <Text style={{ color: SLATE, fontWeight: 700 }}>{t.score}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Footer pageNum={1} total={7} />
      </Page>

      {/* PAGE 2: OCEAN PROFILE */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.h1}>Your OCEAN Profile</Text>
        <Text style={s.body}>
          The Big Five (OCEAN) model measures five fundamental dimensions of personality. Your scores indicate your relative preference and natural tendencies on each spectrum compared to a normative baseline.
        </Text>
        
        <View style={{ marginTop: 24 }}>
          {[
            { label: "Openness", score: data.scores.openness, level: data.profile.openness.level },
            { label: "Conscientiousness", score: data.scores.conscientiousness, level: data.profile.conscientiousness.level },
            { label: "Extraversion", score: data.scores.extraversion, level: data.profile.extraversion.level },
            { label: "Agreeableness", score: data.scores.agreeableness, level: data.profile.agreeableness.level },
            { label: "Neuroticism", score: data.scores.neuroticism, level: data.profile.neuroticism.level },
          ].map(t => (
            <View key={t.label} style={s.oceanRow}>
              <View style={s.oceanLabelBox}>
                <Text style={s.oceanTraitName}>{t.label}</Text>
                <Text style={s.oceanTraitLevel}>{t.level}</Text>
              </View>
              <View style={s.oceanBarWrap}>
                <View style={[s.oceanBarFill, { width: `${t.score}%` }]} />
              </View>
              <View style={s.oceanScoreBox}>
                <Text style={s.oceanScore}>{t.score}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 16, padding: 12, borderWidth: 1, borderColor: BORDER, borderRadius: 8, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 9, color: SLATE }}><Text style={s.bold}>Legend:</Text>  Low ({data.scoreLegend.low})</Text>
          <Text style={{ fontSize: 9, color: SLATE }}>Moderate ({data.scoreLegend.moderate})</Text>
          <Text style={{ fontSize: 9, color: SLATE }}>High ({data.scoreLegend.high})</Text>
        </View>

        <Footer pageNum={2} total={7} />
      </Page>

      {/* PAGE 3: TRAIT INSIGHTS */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.h1}>Trait Insights</Text>
        
        {[
          { t: "Openness", d: data.traitInsights.openness },
          { t: "Conscientiousness", d: data.traitInsights.conscientiousness },
          { t: "Extraversion", d: data.traitInsights.extraversion },
          { t: "Agreeableness", d: data.traitInsights.agreeableness },
          { t: "Neuroticism", d: data.traitInsights.neuroticism },
        ].map(({ t, d }) => (
          <View key={t} style={s.insightCard} wrap={false}>
            <View style={s.insightHeaderRow}>
              <Text style={s.h3}>{t}</Text>
              <Text style={s.insightScoreBadge}>{d.score}% / {d.level}</Text>
            </View>
            <Text style={s.body}><Text style={s.bold}>What this suggests:</Text> {d.meaning}</Text>
            {d.implication && <Text style={s.body}><Text style={s.bold}>Practical implication:</Text> {d.implication}</Text>}
          </View>
        ))}

        <Footer pageNum={3} total={7} />
      </Page>

      {/* PAGE 4: STRENGTHS & BEHAVIOURAL STYLE */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.h1}>Strengths & Behavioural Style</Text>
        
        <View style={s.cardLight} wrap={false}>
          <Text style={s.h3}>Major Strengths</Text>
          {data.strengths.map((st, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>•</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.body}><Text style={s.bold}>{st.strength}</Text></Text>
                {st.tradeOff && <Text style={{ fontSize: 9, color: SLATE, fontStyle: "italic", marginBottom: 6 }}>Trade-off: {st.tradeOff}</Text>}
              </View>
            </View>
          ))}
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Leadership Potential</Text>
          <Text style={s.body}><Text style={s.bold}>Style:</Text> {data.leadership.style}</Text>
          {data.leadership.strengths && <Text style={s.body}><Text style={s.bold}>Core Strengths:</Text> {data.leadership.strengths}</Text>}
          {data.leadership.teamContribution && <Text style={s.body}><Text style={s.bold}>Team Contribution:</Text> {data.leadership.teamContribution}</Text>}
          {data.leadership.development && <Text style={s.body}><Text style={s.bold}>Development Area:</Text> {data.leadership.development}</Text>}
          {data.leadership.drivenByScores && <Text style={s.provenance}>Based on: {data.leadership.drivenByScores}</Text>}
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Communication Style</Text>
          <Text style={s.body}><Text style={s.bold}>Preferred Approach:</Text> {data.communication.preferredStyle}</Text>
          {data.communication.teamTendency && <Text style={s.body}><Text style={s.bold}>Team Dynamics:</Text> {data.communication.teamTendency}</Text>}
          {data.communication.strength && <Text style={s.body}><Text style={s.bold}>Communication Strength:</Text> {data.communication.strength}</Text>}
          {data.communication.blindSpot && <Text style={s.body}><Text style={s.bold}>Potential Blind Spot:</Text> {data.communication.blindSpot}</Text>}
          {data.communication.drivenByScores && <Text style={s.provenance}>Based on: {data.communication.drivenByScores}</Text>}
        </View>

        <Footer pageNum={4} total={7} />
      </Page>

      {/* PAGE 5: DECISION, CAREER & LEARNING */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.h1}>Decision, Career & Learning</Text>

        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Decision-Making Profile</Text>
          <Text style={s.body}><Text style={s.bold}>Approach:</Text> {data.decisionMaking.structuredVsExploratory}</Text>
          {data.decisionMaking.speedVsDeliberation && <Text style={s.body}><Text style={s.bold}>Pace:</Text> {data.decisionMaking.speedVsDeliberation}</Text>}
          {data.decisionMaking.peopleConsiderations && <Text style={s.body}><Text style={s.bold}>People Focus:</Text> {data.decisionMaking.peopleConsiderations}</Text>}
          {data.decisionMaking.underUncertainty && <Text style={s.body}><Text style={s.bold}>Under Uncertainty:</Text> {data.decisionMaking.underUncertainty}</Text>}
          {data.decisionMaking.drivenByScores && <Text style={s.provenance}>Based on: {data.decisionMaking.drivenByScores}</Text>}
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Career Suitability</Text>
          <Text style={s.body}><Text style={s.bold}>Environments:</Text> {data.careerSuitability.overview}</Text>
          {data.careerSuitability.whyFit && <Text style={s.body}><Text style={s.bold}>Why It Fits:</Text> {data.careerSuitability.whyFit}</Text>}
          <Text style={[s.body, s.bold, { marginTop: 8 }]}>Potentially Compatible Roles:</Text>
          <View style={s.tagContainer}>
            {data.careerSuitability.roles.map((c, i) => (
              <Text key={i} style={s.tag}>{c}</Text>
            ))}
          </View>
          {data.careerSuitability.caveat && <Text style={{ fontSize: 9, color: SLATE, fontStyle: "italic", marginTop: 4 }}>{data.careerSuitability.caveat}</Text>}
          {data.careerSuitability.drivenByScores && <Text style={s.provenance}>Based on: {data.careerSuitability.drivenByScores}</Text>}
        </View>

        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Learning Style</Text>
          <Text style={s.body}><Text style={s.bold}>Structure:</Text> {data.learningStyle.preferredStructure}</Text>
          {data.learningStyle.pace && <Text style={s.body}><Text style={s.bold}>Pace:</Text> {data.learningStyle.pace}</Text>}
          {data.learningStyle.feedback && <Text style={s.body}><Text style={s.bold}>Feedback Receptivity:</Text> {data.learningStyle.feedback}</Text>}
          {data.learningStyle.independentVsCollaborative && <Text style={s.body}><Text style={s.bold}>Format Preference:</Text> {data.learningStyle.independentVsCollaborative}</Text>}
        </View>

        <Footer pageNum={5} total={7} />
      </Page>

      {/* PAGE 6: DEVELOPMENT & ACTION PLAN */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.h1}>Development & Action Plan</Text>

        <Text style={s.h2}>Development Areas</Text>
        <View style={{ marginBottom: 24 }}>
          {data.developmentAreas.map((dev, i) => (
            <View key={i} style={s.card} wrap={false}>
              <Text style={s.h3}>{dev.area}</Text>
              {dev.whyItMatters && <Text style={s.body}><Text style={s.bold}>Why it matters:</Text> {dev.whyItMatters}</Text>}
              {dev.practicalGrowth && <Text style={s.body}><Text style={s.bold}>Growth direction:</Text> {dev.practicalGrowth}</Text>}
            </View>
          ))}
        </View>

        <Text style={s.h2}>Action Plan</Text>
        <View>
          {data.actionPlan.map((rec, i) => (
            <View key={i} style={s.actionCard} wrap={false}>
              <Text style={s.actionNum}>0{i + 1}</Text>
              <View style={s.actionContent}>
                <Text style={s.h3}>{rec.action}</Text>
                {rec.why && <Text style={s.body}>{rec.why}</Text>}
              </View>
            </View>
          ))}
        </View>

        <Footer pageNum={6} total={7} />
      </Page>

      {/* PAGE 7: METHODOLOGY & DISCLAIMER */}
      <Page size="A4" style={s.page}>
        <Header />
        <Text style={s.h1}>Methodology & Limitations</Text>
        
        <View style={s.cardLight} wrap={false}>
          <Text style={s.h3}>Assessment Methodology</Text>
          <View style={s.grid}>
            <View style={s.col}>
              <Text style={s.metaLabel}>Model</Text>
              <Text style={s.body}>{data.methodology.model}</Text>
              <Text style={s.metaLabel}>Scale</Text>
              <Text style={s.body}>{data.methodology.scale}</Text>
            </View>
            <View style={s.col}>
              <Text style={s.metaLabel}>Total Items</Text>
              <Text style={s.body}>{data.methodology.items}</Text>
              <Text style={s.metaLabel}>Scoring</Text>
              <Text style={s.body}>{data.methodology.scoring}</Text>
            </View>
          </View>
        </View>

        {data.methodology.limitations && data.methodology.limitations.length > 0 && (
          <View style={s.card} wrap={false}>
            <Text style={s.h3}>Limitations to Consider</Text>
            {data.methodology.limitations.map((lim, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{lim}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.card} wrap={false}>
          <Text style={s.h3}>Summary</Text>
          <Text style={s.body}>{data.summary}</Text>
        </View>

        <View style={{ marginTop: "auto", paddingTop: 24, borderTopWidth: 1, borderTopColor: BORDER }}>
          <Text style={s.h3}>Disclaimer</Text>
          <Text style={{ fontSize: 9, color: SLATE, lineHeight: 1.5 }}>
            {data.disclaimer}
          </Text>
        </View>

        <Footer pageNum={7} total={7} />
      </Page>

    </Document>
  );
}


