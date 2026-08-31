# Admin Flow

1. **Authentication**: Admin logs in via `/admin/login` using a secure password verified by bcrypt. Session is stored in an encrypted HttpOnly cookie.
2. **Dashboard**: High-level metrics (Total participants, paid assessments, completion rate).
3. **Participants**: View all registered users and their status.
4. **Payments**: Audit log of Razorpay transactions.
5. **Reports**: Access generated user profiles.
6. **Evidence**: Exportable CSV mapping participants to Razorpay IDs.
7. **Reset Control**: Secure route to reset the database (preserves admin auth, wipes user data).
