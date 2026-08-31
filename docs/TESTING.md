# Testing

- **Framework**: Jest & ts-jest.
- **Suites Passed**: 4 suites, 67 tests.
- **Coverage**: Covers Razorpay signature logic, the scoring engine (reverse scoring, normalization, deterministic output), admin metrics aggregation, and response quality checks.
- **Typecheck**: `npx tsc --noEmit` passes with 0 errors.
- **Build**: `next build` successfully compiles all routes.
