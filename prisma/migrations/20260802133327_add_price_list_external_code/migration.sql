-- AlterTable
ALTER TABLE "PriceListItem" ADD COLUMN "externalCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_externalCode_key" ON "PriceListItem"("externalCode");
