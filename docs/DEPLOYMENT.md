# Deployment

- **Platform**: Designed for Vercel.
- **Database**: PostgreSQL (e.g., Supabase or Neon), configured via `DATABASE_URL`.
- **Environment Variables (Required)**:
  - `DATABASE_URL` (Prisma PG connection)
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID` (Public)
  - `RAZORPAY_KEY_SECRET` (Secret)
  - `ADMIN_PASSWORD_HASH` (Generated via bcrypt)
  - `ADMIN_SESSION_SECRET` (32+ char random string)
  - `RESEND_API_KEY` (Secret)
