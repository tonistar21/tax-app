
ALTER TABLE "Order" ADD COLUMN     "cityRate" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "compositeTaxRate" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "countyRate" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "jurisdictions" JSONB NOT NULL,
ADD COLUMN     "latitude" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "longitude" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "specialRates" JSONB NOT NULL,
ADD COLUMN     "stateRate" DECIMAL(9,6) NOT NULL,
ADD COLUMN     "subtotalCents" INTEGER NOT NULL,
ADD COLUMN     "taxCents" INTEGER NOT NULL,
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "totalCents" INTEGER NOT NULL;

CREATE UNIQUE INDEX "Order_externalId_key" ON "Order"("externalId");
