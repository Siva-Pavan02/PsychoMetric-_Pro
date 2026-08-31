# Database Schema

- **Participant**: `id`, `name`, `email`, `phone`
- **Assessment**: `id`, `status` (CREATED, PAYMENT_PENDING, COMPLETED), timestamps.
- **Payment**: `id`, `razorpayOrderId`, `razorpayPaymentId`, `amount`, `status`.
- **Response**: Stores individual question answers (1-5).
- **Result**: Stores raw 0-100 normalized scores for the 5 traits.
- **Report**: Stores the generated JSON content (classifications, strengths, action plan).
