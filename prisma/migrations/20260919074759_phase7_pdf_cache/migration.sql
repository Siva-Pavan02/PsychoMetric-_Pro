-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "pdfBuffer" BYTEA,
ADD COLUMN     "pdfGeneratedAt" TIMESTAMP(3);
