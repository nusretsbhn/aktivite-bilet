-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN "ledgerId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_ledgerId_key" ON "BankTransaction"("ledgerId");
