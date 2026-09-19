export function getReportEmailHtml(name: string, reportLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
    .header { background-color: #10233d; padding: 30px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.05em; }
    .content { padding: 40px; }
    .content p { font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
    .button-container { text-align: center; margin: 32px 0; }
    .button { display: inline-block; background-color: #2b7a78; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 9999px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px; }
    .footer { background-color: #f1f5f9; padding: 20px 40px; text-align: center; font-size: 12px; color: #64748b; }
    .footer a { color: #2b7a78; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PsychoMetric Pro</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>Your comprehensive personality assessment report is ready. It contains detailed insights into your OCEAN traits, strengths, and development areas.</p>
      <div class="button-container">
        <a href="${reportLink}" class="button">View Your Report</a>
      </div>
      <p>If the button doesn't work, copy and paste this link into your browser:<br><br><a href="${reportLink}" style="color: #2b7a78; word-break: break-all;">${reportLink}</a></p>
      <p>Best regards,<br>The PsychoMetric Pro Team</p>
    </div>
    <div class="footer">
      <p>This report link is private and should not be shared.</p>
    </div>
  </div>
</body>
</html>
  `;
}
