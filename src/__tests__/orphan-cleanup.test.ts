import { POST, GET } from "../app/api/admin/participants/cleanup/route";
import { db } from "../lib/db";
import { requireAdmin } from "../lib/auth";
import { NextRequest } from "next/server";

jest.mock("../lib/db", () => ({
  db: {
    participant: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    assessment: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    payment: {
      deleteMany: jest.fn(),
    },
    response: {
      deleteMany: jest.fn(),
    },
    result: {
      deleteMany: jest.fn(),
    },
    report: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    reportPdf: {
      deleteMany: jest.fn(),
    }
  },
}));

jest.mock("../lib/auth", () => ({
  requireAdmin: jest.fn(),
}));

jest.mock("../lib/audit", () => ({
  logAdminAction: jest.fn(),
}));

describe("Orphan Cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAdmin as jest.Mock).mockResolvedValue(true);
  });

  const createReq = () => new NextRequest("http://localhost/api/admin/participants/cleanup");

  describe("GET Preview", () => {
    it("returns total orphans count correctly", async () => {
      (db.participant.count as jest.Mock).mockResolvedValue(42);

      const res = await GET(createReq());
      const json = await res.json();

      expect(json).toEqual({ totalOrphans: 42 });
      expect(db.participant.count).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          NOT: {
            OR: [
              { assessments: { some: { status: { notIn: ["CREATED", "PAYMENT_FAILED"] } } } },
              { payments: { some: { status: { notIn: ["FAILED"] } } } },
            ],
          },
        }),
      }));
    });
  });

  describe("POST Execute", () => {
    it("deletes exactly the correctly matched orphans", async () => {
      (db.participant.findMany as jest.Mock).mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
      (db.assessment.findMany as jest.Mock).mockResolvedValue([{ id: "a1" }]);
      (db.report.findMany as jest.Mock).mockResolvedValue([{ id: "r1" }]);
      (db.participant.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      const res = await POST(createReq());
      const json = await res.json();

      expect(json).toEqual({ success: true, deleted: 2 });
      expect(db.participant.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          NOT: {
            OR: [
              { assessments: { some: { status: { notIn: ["CREATED", "PAYMENT_FAILED"] } } } },
              { payments: { some: { status: { notIn: ["FAILED"] } } } },
            ],
          },
        }),
      }));

      expect(db.payment.deleteMany).toHaveBeenCalledWith({ where: { assessmentId: { in: ["a1"] }, status: "FAILED" } });
      expect(db.reportPdf.deleteMany).toHaveBeenCalledWith({ where: { reportId: { in: ["r1"] } } });
      expect(db.report.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["r1"] } } });
      expect(db.assessment.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["a1"] } } });
      expect(db.participant.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["p1", "p2"] } } });
    });
  });
});
