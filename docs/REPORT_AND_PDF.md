# Report and PDF

## Web Report
The web report (`/report/[id]`) displays a circular radar chart, trait breakdowns, strengths, communication styles, and action plans based on the generated JSON.

## PDF Export
The PDF is generated dynamically using `@react-pdf/renderer`. It includes:
- Cover page with participant name.
- Executive summary.
- Detailed breakdowns for Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism.
- Final action plan.
Returns as `application/pdf` with correct headers.
