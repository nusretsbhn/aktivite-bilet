-- AddForeignKey
ALTER TABLE "ActivityCurrentAccount" ADD CONSTRAINT "ActivityCurrentAccount_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- İptal edilmiş biletlerin eski cari kayıtlarını temizle
DELETE FROM "ActivityCurrentAccount"
WHERE "ticketId" IN (SELECT "id" FROM "Ticket" WHERE "status" = 'CANCELLED');
