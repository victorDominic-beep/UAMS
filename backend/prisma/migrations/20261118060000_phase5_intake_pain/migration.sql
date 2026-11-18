ALTER TABLE "SRVLineItem"
ADD COLUMN "assetCategoryId" UUID,
ADD COLUMN "assetType" TEXT,
ADD COLUMN "usefulLifeYears" INTEGER,
ADD COLUMN "isDepreciable" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "IdentifierCounter"
ADD COLUMN "unitCode" TEXT;

DROP INDEX IF EXISTS "IdentifierCounter_prefix_year_categoryCode_key";
CREATE UNIQUE INDEX "IdentifierCounter_prefix_year_unitCode_categoryCode_key"
ON "IdentifierCounter"("prefix", "year", "unitCode", "categoryCode");
CREATE INDEX "IdentifierCounter_unitCode_categoryCode_year_idx"
ON "IdentifierCounter"("unitCode", "categoryCode", "year");

ALTER TABLE "SRVLineItem"
ADD CONSTRAINT "SRVLineItem_assetCategoryId_fkey"
FOREIGN KEY ("assetCategoryId") REFERENCES "AssetCategory"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "SRVLineItem_assetCategoryId_idx" ON "SRVLineItem"("assetCategoryId");
