-- Cari hareket tarihini tur tarihinden bilet kesim tarihine çevir
UPDATE "ActivityCurrentAccount" aca
SET "date" = t."createdAt"
FROM "Ticket" t
WHERE aca."ticketId" = t.id;
