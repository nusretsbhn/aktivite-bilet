-- CreateTable
CREATE TABLE "ActivityCurrentAccount" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "ticketId" INTEGER,
    "description" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityCurrentAccount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ActivityCurrentAccount" ADD CONSTRAINT "ActivityCurrentAccount_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
