ALTER TABLE "Order" ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "importRowNumber" INTEGER;

DROP TABLE "geo_city_exceptions";


DROP TABLE "geo_counties";

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filename" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_importBatchId_importRowNumber_key" ON "Order"("importBatchId", "importRowNumber");

ALTER TABLE "Order" ADD CONSTRAINT "Order_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
