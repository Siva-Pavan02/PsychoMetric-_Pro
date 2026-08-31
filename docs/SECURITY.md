# Security

- **Payments**: Razorpay signatures are verified server-side using `crypto.createHmac` to prevent spoofing.
- **Admin Auth**: Admin password is hashed via `bcryptjs`. Sessions use `cookies().set` with `httpOnly`, `secure` (in prod), `sameSite: 'strict'`, and an expiration time. Depends on `ADMIN_SESSION_SECRET`.
- **Data Privacy**: No user can view another's assessment without the unguessable UUID token.
- **Rate Limiting/Validation**: `zod` is used across all API routes to prevent malformed payloads.
