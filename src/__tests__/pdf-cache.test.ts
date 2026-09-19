import { NextRequest } from "next/server";
import { GET } from "@/app/api/report/[id]/pdf/route";
import { POST as regenPdf } from "@/app/api/admin/reports/[id]/regen-pdf/route";
import { POST as clearPdf } from "@/app/api/admin/reports/[id]/clear-pdf/route";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import crypto from "crypto";

jest.mock("@/lib/db", () => ({
  db: {
    report: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reportPdf: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireAdmin: jest.fn(),
}));

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: jest.fn((cb) => cb()),
}));

jest.mock("@react-pdf/renderer", () => ({
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from("mock-pdf-bytes")),
  StyleSheet: { create: jest.fn((styles) => styles) },
  Document: jest.fn(({ children }) => children),
  Page: jest.fn(({ children }) => children),
  Text: jest.fn(({ children }) => children),
  View: jest.fn(({ children }) => children),
  Font: { register: jest.fn() },
}));

describe("PDF Caching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("serves cached PDF if available", async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(true);

    const mockContent = { participantName: "Test User" };
    // We assume PDF_TEMPLATE_VERSION is "v1" as we wrote it
    const mockHash = crypto.createHash("sha256").update(JSON.stringify(mockContent) + "v1").digest("hex");

    const mockReport = {
      id: "123",
      content: mockContent,
      pdf: {
        bytes: Buffer.from("cached-pdf-bytes"),
        contentHash: mockHash
      }
    };
    (db.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

    const req = new NextRequest("http://localhost/api/report/123/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });

    expect(res.status).toBe(200);
    const buffer = await res.arrayBuffer();
    expect(Buffer.from(buffer).toString()).toBe("cached-pdf-bytes");
    expect(db.reportPdf.upsert).not.toHaveBeenCalled(); // No regen
  });

  it("regenerates PDF via admin route", async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(true);
    const mockContent = { participantName: "Test User" };
    const mockReport = {
      id: "123",
      content: mockContent,
    };
    (db.report.findUnique as jest.Mock).mockResolvedValue(mockReport);

    const req = new NextRequest("http://localhost/api/admin/reports/123/regen-pdf", { method: "POST" });
    const res = await regenPdf(req, { params: Promise.resolve({ id: "123" }) });

    expect(res.status).toBe(200);
    expect(db.reportPdf.upsert).toHaveBeenCalledWith({
      where: { reportId: "123" },
      create: expect.objectContaining({
        bytes: Buffer.from("mock-pdf-bytes"),
        reportId: "123"
      }),
      update: expect.objectContaining({
        bytes: Buffer.from("mock-pdf-bytes"),
      }),
    });
  });

  it("clears PDF cache via admin route", async () => {
    (requireAdmin as jest.Mock).mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/admin/reports/123/clear-pdf", { method: "POST" });
    const res = await clearPdf(req, { params: Promise.resolve({ id: "123" }) });

    expect(res.status).toBe(200);
    expect(db.reportPdf.delete).toHaveBeenCalledWith({
      where: { reportId: "123" },
    });
  });
});
