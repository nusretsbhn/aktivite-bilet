-- Mevcut biletler için maliyet gider kaydı (Bilet Maliyeti)
INSERT INTO "GeneralLedger" ("type", "category", "description", "amount", "date", "referenceId", "createdBy")
SELECT
  'EXPENSE'::"LedgerType",
  'Bilet Maliyeti',
  'Bilet: ' || t."ticketNo",
  -COALESCE(SUM(ta."buyTotal"), 0),
  t."createdAt",
  t.id,
  t."createdBy"
FROM "Ticket" t
INNER JOIN "TicketActivity" ta ON ta."ticketId" = t.id
WHERE t.status IN ('ACTIVE', 'EDITED')
GROUP BY t.id, t."ticketNo", t."createdAt", t."createdBy"
HAVING COALESCE(SUM(ta."buyTotal"), 0) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "GeneralLedger" gl
    WHERE gl."referenceId" = t.id
      AND gl."category" = 'Bilet Maliyeti'
  );
