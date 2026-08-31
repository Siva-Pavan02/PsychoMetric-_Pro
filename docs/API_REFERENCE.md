# API Reference

- `POST /api/assessment/start`: Creates a participant and pending assessment.
- `POST /api/payment/create-order`: Generates a Razorpay order ID.
- `POST /api/payment/verify`: Validates Razorpay HMAC signature and unlocks assessment.
- `GET /api/assessment/[token]/questions`: Retrieves 50 questions if payment is SUCCESS.
- `POST /api/assessment/[token]/submit`: Submits answers, runs scoring engine, saves report.
- `GET /api/report/[id]/pdf`: Generates and returns the PDF buffer.
- `POST /api/admin/login`: Authenticates admin.
- `POST /api/admin/logout`: Clears session.
- `POST /api/admin/reset`: Hard resets database (requires admin session).
