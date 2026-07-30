"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { JobStatus } from "@prisma/client";

const NewJobSchema = z.object({
  title: z.string().trim().min(1, "Job title is required"),
  siteAddress: z.string().trim().optional(),
  clientId: z.string().trim().optional(),
  clientName: z.string().trim().optional(),
  clientEmail: z.string().trim().optional(),
  clientPhone: z.string().trim().optional(),
  clientAddress: z.string().trim().optional(),
});

export async function createJob(formData: FormData) {
  await verifySession();

  const parsed = NewJobSchema.parse({
    title: formData.get("title"),
    siteAddress: formData.get("siteAddress") || undefined,
    clientId: formData.get("clientId") || undefined,
    clientName: formData.get("clientName") || undefined,
    clientEmail: formData.get("clientEmail") || undefined,
    clientPhone: formData.get("clientPhone") || undefined,
    clientAddress: formData.get("clientAddress") || undefined,
  });

  let clientId = parsed.clientId;

  if (!clientId) {
    if (!parsed.clientName) {
      throw new Error("Select an existing client or enter a new client name.");
    }
    const client = await prisma.client.create({
      data: {
        name: parsed.clientName,
        email: parsed.clientEmail || null,
        phone: parsed.clientPhone || null,
        address: parsed.clientAddress || null,
      },
    });
    clientId = client.id;
  }

  const job = await prisma.job.create({
    data: {
      title: parsed.title,
      siteAddress: parsed.siteAddress || null,
      clientId,
    },
  });

  revalidatePath("/");
  redirect(`/jobs/${job.id}`);
}

export async function updateJobStatus(id: string, formData: FormData) {
  await verifySession();
  const status = formData.get("status");
  const parsedStatus = z.enum(JobStatus).parse(status);

  await prisma.job.update({ where: { id }, data: { status: parsedStatus } });
  revalidatePath("/");
  revalidatePath(`/jobs/${id}`);
}
