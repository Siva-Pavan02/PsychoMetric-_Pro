/*
  Warnings:

  - You are about to drop the column `pdfBuffer` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `pdfGeneratedAt` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "pdfBuffer",
DROP COLUMN "pdfGeneratedAt";

-- CreateTable
CREATE TABLE "ReportPdf" (
    "reportId" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportPdf_pkey" PRIMARY KEY ("reportId")
);

-- AddForeignKey
ALTER TABLE "ReportPdf" ADD CONSTRAINT "ReportPdf_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
