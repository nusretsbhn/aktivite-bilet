-- AlterTable Activity: prices + displayName
ALTER TABLE "Activity" ADD COLUMN "adultBuyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "adultSellPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "childBuyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "childSellPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "infantBuyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "infantSellPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "displayName" TEXT;

UPDATE "Activity" SET "displayName" = "name" WHERE "displayName" IS NULL;

ALTER TABLE "Activity" ALTER COLUMN "displayName" SET NOT NULL;

-- AlterTable TicketActivity: per-line tour date
ALTER TABLE "TicketActivity" ADD COLUMN "tourDate" TIMESTAMP(3),
ADD COLUMN "tourStartTime" TEXT;

UPDATE "TicketActivity" ta
SET "tourDate" = t."tourDate"
FROM "Ticket" t
WHERE ta."ticketId" = t.id AND ta."tourDate" IS NULL;

ALTER TABLE "TicketActivity" ALTER COLUMN "tourDate" SET NOT NULL;
