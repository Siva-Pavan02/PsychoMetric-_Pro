import Link from "next/link";

const TRAITS = [
  { name: "Openness",          icon: "💡", desc: "Curiosity, creativity, and appetite for new ideas and experiences." },
  { name: "Conscientiousness", icon: "📋", desc: "Organisation, reliability, and goal-directed self-discipline." },
  { name: "Extraversion",      icon: "🤝", desc: "Sociability, assertiveness, and energy from social interaction." },
  { name: "Agreeableness",     icon: "❤️", desc: "Empathy, cooperation, and warmth towards others." },
  { name: "Neuroticism",       icon: "🧘", desc: "Emotional stability, stress resilience, and mood regulation." },
];

const STEPS = [
  { step: "01", title: "Enter Your Details",  desc: "Name, email, and phone — nothing more." },
  { step: "02", title: "Pay ₹99",             desc: "Secure payment via Razorpay. Instant unlock." },
  { step: "03", title: "Answer 50 Questions", desc: "A validated Big Five questionnaire. Takes ~8 minutes." },
  { step: "04", title: "Receive Your Report", desc: "Personalized online report + PDF download + email." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neu-bg text-slate-800">
      {/* Nav */}
      <nav className="border-b-0 bg-neu-bg/80 backdrop-blur sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-[#1e3a5f] text-lg tracking-tight">PsychoMetric Pro</span>
          <Link
            href="/assessment"
            className="bg-neu-bg text-[#1e3a5f] shadow-neu-sm hover:shadow-neu-pressed text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
          >
            Start Assessment
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <span className="inline-block bg-neu-bg shadow-neu-pressed text-[var(--color-accent)] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
          Big Five / OCEAN Model
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#1e3a5f] leading-tight mb-6">
          Discover Your Personality Profile
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          A professional 50-question personality assessment based on the globally validated Big Five model.
          Receive a personalised report covering strengths, leadership potential, career fit, and more — in under 10 minutes.
        </p>
        <Link
          href="/assessment"
          className="inline-block bg-neu-bg text-[#1e3a5f] shadow-neu-flat hover:shadow-neu-pressed font-bold px-8 py-4 rounded-xl text-lg transition-all"
        >
          Start Assessment for ₹99 →
        </Link>
        <p className="text-xs text-slate-400 mt-6">No account required · Instant access · PDF included</p>
      </section>

      {/* OCEAN Dimensions */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1e3a5f] text-center mb-2">Five Dimensions of Personality</h2>
          <p className="text-slate-500 text-center mb-10 text-sm">Each trait is measured independently with 10 validated questions.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TRAITS.map((t) => (
              <div key={t.name} className="bg-neu-bg rounded-2xl p-6 shadow-neu-flat transition-all">
                <div className="text-3xl mb-3">{t.icon}</div>
                <h3 className="font-semibold text-[#1e3a5f] mb-1">{t.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{t.desc}</p>
              </div>
            ))}
            {/* 6th card — report promise */}
            <div className="bg-neu-bg rounded-2xl p-6 shadow-neu-flat transition-all">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="font-semibold text-[#1e3a5f] mb-1">12 Report Sections</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Strengths, leadership, communication, decision-making, career suitability, learning style, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-[#1e3a5f] text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.step} className="flex flex-col items-center sm:items-start text-center sm:text-left bg-neu-bg shadow-neu-flat rounded-2xl p-6">
              <span className="text-3xl font-black text-[#1e3a5f]/20 mb-3">{s.step}</span>
              <h3 className="font-semibold text-[#1e3a5f] mb-1">{s.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you'll receive */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1e3a5f] text-center mb-10">What You Will Receive</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {[
              "Overall Personality Profile",
              "Personality Type Summary",
              "Major Strengths",
              "Leadership Potential",
              "Communication Style",
              "Decision-Making Style",
              "Career Suitability",
              "Learning Style",
              "Stress & Coping Tendencies",
              "Motivational Drivers",
              "3–5 Personalised Recommendations",
              "Downloadable PDF Report",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-neu-bg shadow-neu-flat rounded-xl px-5 py-4">
                <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-neu-bg shadow-neu-pressed">
                  <span className="text-[var(--color-accent)] text-sm font-bold">✓</span>
                </div>
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="bg-neu-bg shadow-neu-flat rounded-3xl p-12 max-w-2xl mx-auto border-4 border-neu-bg">
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-3">One-Time Fee</p>
          <div className="text-6xl font-black text-[#1e3a5f] mb-3">₹99</div>
          <p className="text-slate-500 font-medium mb-10">Full assessment + personalised report + PDF download</p>
          <Link
            href="/assessment"
            className="inline-block bg-neu-bg text-[#1e3a5f] shadow-neu-flat hover:shadow-neu-pressed font-bold px-10 py-4 rounded-2xl text-lg transition-all"
          >
            Get Started Now →
          </Link>
          <p className="text-slate-400 text-xs mt-6">Secured by Razorpay · Report delivered immediately after submission</p>
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="py-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="bg-neu-bg shadow-neu-pressed rounded-2xl p-6 max-w-2xl mx-auto">
            <p className="text-xs text-slate-500 leading-relaxed">
              PsychoMetric Pro assessments are intended for educational, self-development, and personality-awareness purposes only.
              Results are not a clinical psychological diagnosis or medical assessment.
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-6">© 2024 PsychoMetric Pro · HRM301 Industrial Psychology</p>
        </div>
      </footer>
    </div>
  );
}
