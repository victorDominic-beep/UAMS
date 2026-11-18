ALTER TABLE "Asset" ADD COLUMN "inServiceDate" DATE;

-- Recover an in-service date only where a recorded, completed custody transfer
-- supplies one. Existing records without that evidence remain NULL for review.
UPDATE "Asset" AS asset
SET "inServiceDate" = transfer."firstTransferredAt"::date
FROM (
  SELECT "assetId", MIN("transferredAt") AS "firstTransferredAt"
  FROM "CustodyTransfer"
  WHERE "status" = 'APPROVED' AND "transferredAt" IS NOT NULL
  GROUP BY "assetId"
) AS transfer
WHERE asset."id" = transfer."assetId"
  AND asset."status" = 'IN_SERVICE'
  AND asset."inServiceDate" IS NULL;
