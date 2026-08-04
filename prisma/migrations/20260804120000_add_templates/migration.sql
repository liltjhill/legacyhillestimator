-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "unitType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateLineItem" (
    "id" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "supplierCode" TEXT,
    "fixedUnits" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unitsPerPiece" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "unitEveryXPieces" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "TemplateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_title_key" ON "Template"("title");

-- CreateIndex
CREATE INDEX "TemplateLineItem_templateId_idx" ON "TemplateLineItem"("templateId");

-- AddForeignKey
ALTER TABLE "TemplateLineItem" ADD CONSTRAINT "TemplateLineItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
