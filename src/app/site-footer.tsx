"use client";

import Link from "next/link";
import { useState } from "react";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzebrgao";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/assessment", label: "Assessment" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "#contact", label: "Contact" },
];

// Global :focus-visible outline is navy — invisible on this surface.
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7fd1cf]";

type Status = "idle" | "submitting" | "success" | "error";
type Fields = { name: string; email: string; message: string };

const EMPTY: Fields = { name: "", email: "", message: "" };

export function validateContact(f: Fields): Partial<Fields> {
  const e: Partial<Fields> = {};
  if (f.name.trim().length < 2) e.name = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (f.message.trim().length < 10) e.message = "Please add a little more detail (at least 10 characters).";
  return e;
}

export default function SiteFooter() {
  const [form, setForm] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Fields>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    const found = validateContact(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });

      if (res.ok) {
        setForm(EMPTY);
        setStatus("success");
        return;
      }

      // Formspree returns { errors: [{ field, message }] } on rejection.
      const data: unknown = await res.json().catch(() => null);
      const list =
        data && typeof data === "object" && "errors" in data && Array.isArray((data as { errors: unknown }).errors)
          ? ((data as { errors: { field?: string; message?: string }[] }).errors)
          : [];

      const fieldErrors: Partial<Fields> = {};
      for (const item of list) {
        if (item.field && item.field in EMPTY) fieldErrors[item.field as keyof Fields] = item.message ?? "Invalid value.";
      }
      setErrors(fieldErrors);
      setErrorMsg(
        Object.keys(fieldErrors).length > 0
          ? "Please correct the highlighted fields and try again."
          : list[0]?.message ?? "We couldn't send your message. Please try again."
      );
      setStatus("error");
    } catch {
      setErrorMsg("We couldn't reach our message service. Check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <footer id="contact" className="mt-10 bg-[#0b1d32] text-slate-300">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-sm">🌊</span>
              <span className="text-base font-bold tracking-tight text-white">PsychoMetric Pro</span>
            </div>

            <h2 className="mt-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">Have a question?</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
              Ask about the assessment, what your report covers, or a payment. Send a message and we&apos;ll reply by
              email.
            </p>

            <nav aria-label="Footer" className="mt-8">
              <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`text-slate-300 transition-colors duration-200 hover:text-[#7fd1cf] ${FOCUS_RING}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 sm:p-7">
            {status === "success" ? (
              <div role="status" className="py-6 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#7fd1cf]/10 text-lg font-bold text-[#2b7a78]">
                  ✓
                </span>
                <h3 className="mt-5 text-lg font-bold tracking-tight text-slate-900">Message sent</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-600">
                  Thanks for reaching out. We&apos;ll get back to you at the email address you provided.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setErrors({});
                  }}
                  className={`mt-6 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 hover:border-slate-400 ${FOCUS_RING}`}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                {errorMsg && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-700"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <p className="text-xs font-semibold leading-tight">{errorMsg}</p>
                  </div>
                )}

                <div className="w-full grid gap-x-4 sm:grid-cols-2">
                  <ContactField
                    id="contact-name"
                    name="name"
                    label="Full name"
                    placeholder="e.g. Priya Sharma"
                    autoComplete="name"
                    value={form.name}
                    error={errors.name}
                    onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  />
                  <ContactField
                    id="contact-email"
                    name="email"
                    type="email"
                    label="Email address"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={form.email}
                    error={errors.email}
                    onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  />
                </div>
                <ContactField
                  id="contact-message"
                  name="message"
                  label="Message"
                  placeholder="Tell us what you'd like to know…"
                  multiline
                  value={form.message}
                  error={errors.message}
                  onChange={(v) => setForm((f) => ({ ...f, message: v }))}
                />

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#2b7a78] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#25696a] disabled:pointer-events-none disabled:opacity-70 ${FOCUS_RING}`}
                >
                  {status === "submitting" ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white/70" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Sending…</span>
                    </>
                  ) : (
                    <span>Send message</span>
                  )}
                </button>

                <p className="pt-3 text-center text-[11px] leading-5 text-slate-500">
                  We only use your email to reply. Never shared.
                </p>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs leading-6 text-slate-400">
          <p className="max-w-2xl mx-auto">
            PsychoMetric Pro assessments are intended for self-development and awareness. Results are not a clinical
            diagnosis.
          </p>
          <p className="mt-2 font-medium">© 2026 PsychoMetric Pro</p>
        </div>
      </div>
    </footer>
  );
}

function ContactField({
  id,
  name,
  label,
  placeholder,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
  multiline = false,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
}) {
  const shared = `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:ring-4 ${
    error
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 hover:border-slate-300 focus:border-[#2b7a78] focus:ring-[#2b7a78]/10"
  }`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${shared} resize-y`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={shared}
        />
      )}
      {/* Reserve space so validation doesn't shift the layout */}
      <div className="mt-1 h-4">
        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
