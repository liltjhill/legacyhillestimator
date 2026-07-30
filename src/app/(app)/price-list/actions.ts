"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const PriceListItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  category: z.string().trim().optional(),
  unit: z.string().trim().min(1, "Unit is required"),
  materialCost: z.coerce.number().min(0),
  laborCost: z.coerce.number().min(0),
  notes: z.string().trim().optional(),
});

export async function createPriceListItem(formData: FormData) {
  await verifySession();

  const parsed = PriceListItemSchema.parse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    unit: formData.get("unit"),
    materialCost: formData.get("materialCost"),
    laborCost: formData.get("laborCost"),
    notes: formData.get("notes") || undefined,
  });

  await prisma.priceListItem.create({ data: parsed });
  revalidatePath("/price-list");
}

export async function updatePriceListItem(id: string, formData: FormData) {
  await verifySession();

  const parsed = PriceListItemSchema.parse({
    name: formData.get("name"),
    category: formData.get("category") || undefined,
    unit: formData.get("unit"),
    materialCost: formData.get("materialCost"),
    laborCost: formData.get("laborCost"),
    notes: formData.get("notes") || undefined,
  });

  await prisma.priceListItem.update({ where: { id }, data: parsed });
  revalidatePath("/price-list");
}

export async function deletePriceListItem(id: string) {
  await verifySession();
  await prisma.priceListItem.delete({ where: { id } });
  revalidatePath("/price-list");
}
