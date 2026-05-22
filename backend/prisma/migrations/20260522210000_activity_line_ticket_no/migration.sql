-- Her aktivite satırı için ayrı sıralı bilet no (00001, 00002, …)
ALTER TABLE "TicketActivity" ADD COLUMN "ticketNo" TEXT;

WITH ordered AS (
  SELECT
    ta.id,
    ROW_NUMBER() OVER (ORDER BY t."createdAt" ASC, ta.id ASC) AS seq
  FROM "TicketActivity" ta
  INNER JOIN "Ticket" t ON t.id = ta."ticketId"
)
UPDATE "TicketActivity" ta
SET "ticketNo" = LPAD(ordered.seq::text, 5, '0')
FROM ordered
WHERE ordered.id = ta.id;

UPDATE "Ticket" t
SET "ticketNo" = sub.first_no
FROM (
  SELECT DISTINCT ON (ta."ticketId")
    ta."ticketId",
    ta."ticketNo" AS first_no
  FROM "TicketActivity" ta
  ORDER BY ta."ticketId", ta.id ASC
) sub
WHERE t.id = sub."ticketId";

ALTER TABLE "TicketActivity" ALTER COLUMN "ticketNo" SET NOT NULL;
CREATE UNIQUE INDEX "TicketActivity_ticketNo_key" ON "TicketActivity"("ticketNo");
