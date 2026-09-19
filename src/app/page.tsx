import Link from "next/link";
import SiteFooter from "./site-footer";
import { config } from "@/lib/config";

const TRAITS = [
  { name: "Openness", icon: "💡", desc: "Curiosity, creativity, and openness to fresh perspectives." },
  { name: "Conscientiousness", icon: "📋", desc: "Organization, reliability, and disciplined execution." },
  { name: "Extraversion", icon: "🗣️", desc: "Energy, presence, and confidence in social settings." },
  { name: "Agreeableness", icon: "🤝", desc: "Empathy, cooperation, and warmth in relationships." },
  { name: "Neuroticism", icon: "⚖️", desc: "Emotional resilience, stress regulation, and balance." },
];

const STEPS = [
  { step: "01", title: "Tell us about you", desc: "A quick intake form keeps the process personal and secure." },
  { step: "02", title: "Complete payment", desc: "Unlock the full report with a transparent one-time fee." },
  { step: "03", title: "Answer 50 questions", desc: "A measured Big Five assessment designed for clarity and focus." },
  { step: "04", title: "Receive your profile", desc: "Access your report and downloadable PDF immediately." },
];

export default function LandingPage() {
  const priceAmount = config.ASSESSMENT_PRICE_PAISE / 100;
  const priceString = config.ASSESSMENT_CURRENCY === "INR" ? `₹${priceAmount}` : `${config.ASSESSMENT_CURRENCY} ${priceAmount}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <nav className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(29,79,122,0.18),_rgba(29,79,122,0.04))] text-sm font-bold text-[#10233d] shadow-[0_10px_30px_rgba(16,35,61,0.12)]">
              🌊
            </span>
            <span className="text-lg font-bold tracking-tight text-[#10233d]">PsychoMetric Pro</span>
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
          </div>
          <Link
            href="/assessment"
            className="inline-flex items-center justify-center rounded-full bg-[#10233d] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(16,35,61,0.18)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#0d1f35]"
          >
            Start assessment
          </Link>
        </div>
      </nav>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-18">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cfe1ef] bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1d4f7a] shadow-[0_10px_22px_rgba(16,35,61,0.06)]">
                <span className="h-2 w-2 rounded-full bg-[#2b7a78]" />
                Evidence-backed personality insights
              </div>

              <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight text-[#1d4f7a] sm:text-5xl lg:text-6xl">
                Understand yourself with clarity.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Measure the traits that shape how you think, communicate, lead, and respond to stress — with a premium, research-based OCEAN assessment and a personalized report in under 10 minutes.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/assessment"
                  className="group relative inline-flex items-center justify-center rounded-full bg-[#10233d] px-7 py-4 text-base font-semibold text-white shadow-[0_18px_30px_rgba(16,35,61,0.18)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_rgba(16,35,61,0.25)] hover:bg-[#0b1d32]"
                >
                  <span className="relative z-10">Start for {priceString}</span>
                  <div className="absolute inset-0 -z-0 rounded-full bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-md"></div>
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-[#cfe1ef] bg-white/80 px-7 py-4 text-base font-semibold text-[#10233d] shadow-[0_10px_25px_rgba(16,35,61,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b7d5e8]"
                >
                  Explore the process
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                <span>no account needed</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span>instant report</span>
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <span>PDF included</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-[radial-gradient(circle,_rgba(43,122,120,0.18),_transparent_55%)] blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/60 bg-white/80 p-5 shadow-[0_28px_48px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0d1f35,#1d4f7a_55%,#2b7a78)] p-5 text-white shadow-[0_20px_32px_rgba(16,35,61,0.18)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100">Trait profile</p>
                      <p className="mt-2 text-2xl font-bold tracking-tight">OCEAN</p>
                    </div>
                    <div className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold">50 Qs</div>
                  </div>

                  <div className="mt-6 space-y-4">
                    {[
                      ["Openness", 86],
                      ["Conscientiousness", 72],
                      ["Extraversion", 64],
                      ["Agreeableness", 80],
                      ["Neuroticism", 58],
                    ].map(([label, score]) => (
                      <div key={label}>
                        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-sky-100">
                          <span>{label}</span>
                          <span>{score}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/12">
                          <div
                            className="h-2.5 rounded-full bg-gradient-to-r from-sky-200 via-white to-cyan-300"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Assessment</p>
                    <p className="mt-2 text-2xl font-bold text-[#10233d]">8 mins</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Profile</p>
                    <p className="mt-2 text-2xl font-bold text-[#10233d]">12 sections</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Five dimensions</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#10233d]">A complete picture of how you operate.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            {TRAITS.map((trait) => (
              <div
                key={trait.name}
                className="group rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_16px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_40px_rgba(15,23,42,0.12)] hover:border-[#b7d5e8]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3f8] text-xl font-bold text-[#10233d] transition-colors duration-300 group-hover:bg-[#10233d] group-hover:text-white">
                  {trait.icon}
                </div>
                <h3 className="text-lg font-bold tracking-tight text-[#10233d]">{trait.name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{trait.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#10233d]">A simple, guided journey from start to insight.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.step} className="group rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-[0_16px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_40px_rgba(15,23,42,0.12)] hover:border-[#b7d5e8]">
                <span className="text-4xl font-bold tracking-tight text-[#dfeef9] transition-colors duration-300 group-hover:text-[#b7d5e8]">{step.step}</span>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-[#10233d]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-7 shadow-[0_24px_40px_rgba(15,23,42,0.08)] sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.8fr]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Included in your profile</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#10233d]">A comprehensive report designed to be actionable.</h2>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#edf3f8] p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">One-time fee</p>
                <p className="mt-3 text-5xl font-bold tracking-tight text-[#10233d]">{priceString}</p>
                <p className="mt-2 text-sm text-slate-600">Includes assessment, personalized report, and PDF export.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                "Overall personality summary",
                "Strengths and blind spots",
                "Leadership potential",
                "Communication style",
                "Decision-making profile",
                "Career-fit indicators",
                "Stress and coping tendencies",
                "Learning style",
                "Action plan",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#dfeef9] text-xs font-bold text-[#1d4f7a]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

