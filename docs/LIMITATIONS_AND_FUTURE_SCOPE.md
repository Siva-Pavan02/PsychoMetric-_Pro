# Limitations and Future Scope

## Limitations
- The application currently assumes INR currency for Razorpay hardcoded in the create-order route.
- PDF generation via React-PDF can be CPU intensive under extreme load; serverless function timeouts on Vercel hobby tier may occur if the PDF exceeds 10s generation time.

## Future Scope
- Implement webhooks for Razorpay to handle asynchronous payment captures in case of dropped connections.
- Add internationalization (i18n) for non-English speakers.
- Add bulk export of full assessment data (not just evidence mappings) for psychological research.
