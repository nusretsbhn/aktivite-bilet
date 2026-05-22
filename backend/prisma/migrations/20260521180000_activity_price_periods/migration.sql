-- CreateTable
CREATE TABLE "ActivityPrice" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "adultBuyPrice" DOUBLE PRECISION NOT NULL,
    "childBuyPrice" DOUBLE PRECISION NOT NULL,
    "infantBuyPrice" DOUBLE PRECISION NOT NULL,
    "adultSellPrice" DOUBLE PRECISION NOT NULL,
    "childSellPrice" DOUBLE PRECISION NOT NULL,
    "infantSellPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ActivityPrice_pkey" PRIMARY KEY ("id")
);

-- Migrate existing Activity flat prices to full-year periods
INSERT INTO "ActivityPrice" (
    "activityId",
    "startDate",
    "endDate",
    "adultBuyPrice",
    "childBuyPrice",
    "infantBuyPrice",
    "adultSellPrice",
    "childSellPrice",
    "infantSellPrice"
)
SELECT
    "id",
    DATE_TRUNC('year', CURRENT_DATE),
    (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'),
    "adultBuyPrice",
    "childBuyPrice",
    "infantBuyPrice",
    "adultSellPrice",
    "childSellPrice",
    "infantSellPrice"
FROM "Activity"
WHERE "adultSellPrice" > 0
   OR "childSellPrice" > 0
   OR "infantSellPrice" > 0
   OR "adultBuyPrice" > 0
   OR "childBuyPrice" > 0
   OR "infantBuyPrice" > 0;

-- Also create zero-price year range for activities without prices (optional coverage)
INSERT INTO "ActivityPrice" (
    "activityId",
    "startDate",
    "endDate",
    "adultBuyPrice",
    "childBuyPrice",
    "infantBuyPrice",
    "adultSellPrice",
    "childSellPrice",
    "infantSellPrice"
)
SELECT
    a."id",
    DATE_TRUNC('year', CURRENT_DATE),
    (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year' - INTERVAL '1 day'),
    0, 0, 0, 0, 0, 0
FROM "Activity" a
WHERE NOT EXISTS (
    SELECT 1 FROM "ActivityPrice" ap WHERE ap."activityId" = a."id"
);

-- Drop price columns from Activity
ALTER TABLE "Activity" DROP COLUMN "adultBuyPrice",
DROP COLUMN "childBuyPrice",
DROP COLUMN "infantBuyPrice",
DROP COLUMN "adultSellPrice",
DROP COLUMN "childSellPrice",
DROP COLUMN "infantSellPrice";

-- CreateIndex
CREATE INDEX "ActivityPrice_activityId_startDate_endDate_idx" ON "ActivityPrice"("activityId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "ActivityPrice" ADD CONSTRAINT "ActivityPrice_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
