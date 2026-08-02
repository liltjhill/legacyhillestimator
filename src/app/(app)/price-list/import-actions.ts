"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const ImportItemSchema = z.object({
  externalCode: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.string().trim().optional(),
  unit: z.string().trim().min(1),
  materialCost: z.coerce.number().min(0),
  laborCost: z.coerce.number().min(0),
});

const ImportBatchSchema = z.array(ImportItemSchema).min(1).max(1000);

/**
 * Bulk upsert keyed on externalCode, in one round trip per batch - a plain
 * Prisma loop of individual upserts would mean one DB round trip per row,
 * far too slow for a catalog with thousands of items.
 */
export async function importPriceListBatch(itemsInput: unknown) {
  await verifySession();

  const items = ImportBatchSchema.parse(itemsInput);

  const values = Prisma.join(
    items.map(
      (item) =>
        Prisma.sql`(${randomUUID()}, ${item.name}, ${item.category ?? null}, ${item.unit}, ${item.materialCost}, ${item.laborCost}, ${item.externalCode}, now(), now())`,
    ),
  );

  await prisma.$executeRaw`
    INSERT INTO "PriceListItem" (id, name, category, unit, "materialCost", "laborCost", "externalCode", "createdAt", "updatedAt")
    VALUES ${values}
    ON CONFLICT ("externalCode") DO UPDATE SET
      name = EXCLUDED.name,
      category = EXCLUDED.category,
      unit = EXCLUDED.unit,
      "materialCost" = EXCLUDED."materialCost",
      "laborCost" = EXCLUDED."laborCost",
      "updatedAt" = now()
  `;

  return { count: items.length };
}

export async function finishPriceListImport() {
  await verifySession();
  revalidatePath("/price-list");
}
