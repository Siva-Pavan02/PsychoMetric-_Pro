import { getReportEmailHtml } from "@/lib/email/templates";
import { config } from "@/lib/config";

describe("Email Configuration and Templates", () => {
  it("validates configuration exists", () => {
    expect(config.RESEND_API_KEY).toBeDefined();
    expect(config.EMAIL_FROM).toBeDefined();
  });

  it("generates correct HTML for report email", () => {
    const name = "John Doe";
    const reportLink = "https://example.com/report/123";
    const html = getReportEmailHtml(name, reportLink);

    expect(html).toContain(name);
    expect(html).toContain(reportLink);
    expect(html).toContain("PsychoMetric Pro");
    expect(html).toContain("This report link is private");
  });
});
