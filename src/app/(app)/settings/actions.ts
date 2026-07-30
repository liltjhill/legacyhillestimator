"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const SettingsSchema = z.object({
  companyName: z.string().trim().min(1),
  companyAddress: z.string().trim().optional().default(""),
  companyPhone: z.string().trim().optional().default(""),
  companyEmail: z.string().trim().optional().default(""),
  companyLicenseNo: z.string().trim().optional().default(""),
  defaultMarkupPct: z.coerce.number().min(0).max(100),
});

export async function updateSettings(formData: FormData) {
  await verifySession();

  const parsed = SettingsSchema.parse({
    companyName: formData.get("companyName"),
    companyAddress: formData.get("companyAddress"),
    companyPhone: formData.get("companyPhone"),
    companyEmail: formData.get("companyEmail"),
    companyLicenseNo: formData.get("companyLicenseNo"),
    defaultMarkupPct: formData.get("defaultMarkupPct"),
  });

  const existing = await prisma.settings.findFirst();
  if (existing) {
    await prisma.settings.update({ where: { id: existing.id }, data: parsed });
  } else {
    await prisma.settings.create({ data: parsed });
  }

  revalidatePath("/settings");
}
