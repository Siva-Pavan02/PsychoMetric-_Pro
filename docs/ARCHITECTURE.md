# Architecture

## Frontend
Built with Next.js App Router (React 19). Uses Server Components for static layouts and Client Components for interactive states (assessment flow, forms). Styling is powered by Tailwind CSS v4.

## Backend & APIs
Next.js Route Handlers (`/api/*`) act as the backend. They handle form submissions, Razorpay order creation, payment verification via HMAC signatures, scoring logic, and PDF generation.

## Database
PostgreSQL managed via Prisma ORM. Handles participants, assessments, payments, results, and JSON reports.

## External Services
- **Razorpay**: For secure INR transactions.
- **Resend**: For transactional email delivery.
- **Vercel**: Deployment platform.
