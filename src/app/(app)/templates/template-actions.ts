"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const TemplateLineItemInput = z.object({
  category: z.string().trim().optional(),
  description: z.string().trim().min(1),
  supplierCode: z.string().trim().optional(),
  fixedUnits: z.coerce.number(),
  unitsPerPiece: z.coerce.number(),
  unitEveryXPieces: z.coerce.number(),
});

const TemplateImportSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  unitType: z.string().trim().min(1),
  lineItems: z.array(TemplateLineItemInput).min(1),
});

export async function importTemplate(input: z.infer<typeof TemplateImportSchema>) {
  await verifySession();

  const parsed = TemplateImportSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    // Re-importing the same template (matched by title) replaces its line
    // items rather than creating a duplicate template.
    const existing = await tx.template.findUnique({
      where: { title: parsed.title },
      select: { id: true },
    });

    const template = existing
      ? await tx.template.update({
          where: { id: existing.id },
          data: { description: parsed.description || null, unitType: parsed.unitType },
        })
      : await tx.template.create({
          data: {
            title: parsed.title,
            description: parsed.description || null,
            unitType: parsed.unitType,
          },
        });

    if (existing) {
      await tx.templateLineItem.deleteMany({ where: { templateId: template.id } });
    }

    await tx.templateLineItem.createMany({
      data: parsed.lineItems.map((item, index) => ({
        templateId: template.id,
        category: item.category || null,
        description: item.description,
        supplierCode: item.supplierCode || null,
        fixedUnits: item.fixedUnits,
        unitsPerPiece: item.unitsPerPiece,
        unitEveryXPieces: item.unitEveryXPieces,
        sortOrder: index,
      })),
    });
  });

  revalidatePath("/templates");
}

export async function deleteTemplate(id: string) {
  await verifySession();
  await prisma.template.delete({ where: { id } });
  revalidatePath("/templates");
}
