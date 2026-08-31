# PsychoMetric Pro - Project Overview

## Purpose
PsychoMetric Pro is a premium, evidence-based personality assessment platform built to deliver a 50-question OCEAN (Big Five) assessment. It guides participants through an intuitive intake, processes secure payments via Razorpay, administers the assessment with deterministic scoring, and generates a personalized report with PDF export.

## Target Users
Individuals seeking self-development and clarity on their behavioral tendencies, as well as professionals and leaders looking to understand their communication and stress management styles.

## Core Features
1. **Premium Landing & Checkout**: Conversion-optimized entry flow with secure Razorpay payment gateway.
2. **50-Question OCEAN Assessment**: Research-backed psychometric evaluation.
3. **Deterministic Scoring Engine**: Real-time evaluation of 5 traits with reverse scoring and normalization.
4. **Instant Personalized Report & PDF**: Beautiful on-screen results and a professionally formatted, downloadable PDF generated via React-PDF.
5. **Admin Dashboard**: Secure management interface for monitoring participants, payments, and generated reports.

## Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, Plus Jakarta Sans
- **Database**: PostgreSQL (via Prisma ORM)
- **Payment**: Razorpay
- **PDF Generation**: @react-pdf/renderer
- **Email**: Resend
- **Security**: bcryptjs, secure cookies, zod validation
