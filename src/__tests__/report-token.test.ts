import { generateToken, hashToken, checkReportAccess } from "@/lib/report-token";

describe("Report Token Utilities", () => {
  it("generates a token of expected length and hashes it", () => {
    const token = generateToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(16);

    const hash = hashToken(token);
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe(token);
  });

  it("checks access for a valid token", () => {
    const token = "my-secret-token";
    const hash = hashToken(token);

    const report = {
      accessTokenHash: hash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
    };

    expect(checkReportAccess(report as unknown as Parameters<typeof checkReportAccess>[0], token)).toBe("ok");
  });

  it("denies access if token is missing or incorrect", () => {
    const token = "my-secret-token";
    const hash = hashToken(token);

    const report = {
      accessTokenHash: hash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: null,
    };

    expect(checkReportAccess(report as unknown as Parameters<typeof checkReportAccess>[0], null)).toBe("bad_token");
    expect(checkReportAccess(report as unknown as Parameters<typeof checkReportAccess>[0], "wrong-token")).toBe("bad_token");
  });

  it("denies access if report is expired", () => {
    const token = "my-secret-token";
    const hash = hashToken(token);

    const report = {
      accessTokenHash: hash,
      expiresAt: new Date(Date.now() - 100000), // In the past
      revokedAt: null,
    };

    expect(checkReportAccess(report as unknown as Parameters<typeof checkReportAccess>[0], token)).toBe("expired");
  });

  it("denies access if report is revoked", () => {
    const token = "my-secret-token";
    const hash = hashToken(token);

    const report = {
      accessTokenHash: hash,
      expiresAt: new Date(Date.now() + 100000),
      revokedAt: new Date(), // Revoked
    };

    expect(checkReportAccess(report as unknown as Parameters<typeof checkReportAccess>[0], token)).toBe("revoked");
  });

  it("allows legacy links without token by default", () => {
    const report = {
      accessTokenHash: null,
      expiresAt: null,
      revokedAt: null,
    };

    expect(checkReportAccess(report as unknown as Parameters<typeof checkReportAccess>[0], "some-token")).toBe("ok");
    expect(checkReportAccess(report as unknown as Parameters<typeof checkReportAccess>[0], null)).toBe("ok");
  });
});
