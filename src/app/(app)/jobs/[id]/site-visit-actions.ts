"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { saveAudioFile } from "@/lib/storage";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // OpenAI's transcription API limit

async function createPendingSiteVisit(jobId: string, audioUrl: string, filename: string) {
  const siteVisit = await prisma.siteVisit.create({
    data: {
      jobId,
      audioUrl,
      audioFilename: filename,
      transcriptionStatus: "PROCESSING",
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return siteVisit.id;
}

/**
 * Local-dev upload path: the audio file travels through the server action's
 * own request body. Vercel's serverless functions cap request bodies well
 * below what a multi-minute recording needs, so production uploads instead
 * go directly from the browser to Vercel Blob (see `uploadSiteVisitFromBlob`
 * and `/api/site-visit/blob-upload`). Either way, this only creates the row
 * - the caller is responsible for triggering `/api/site-visit/[id]/transcribe`
 * as its own request so transcription gets a dedicated time budget.
 */
export async function uploadSiteVisit(jobId: string, formData: FormData) {
  await verifySession();

  const file = formData.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an audio file to upload.");
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("Audio file is larger than the 25MB transcription limit.");
  }

  const { url, filename } = await saveAudioFile(jobId, file);
  return createPendingSiteVisit(jobId, url, filename);
}

export async function uploadSiteVisitFromBlob(jobId: string, audioUrl: string, filename: string) {
  await verifySession();
  return createPendingSiteVisit(jobId, audioUrl, filename);
}

export async function retryTranscription(jobId: string, siteVisitId: string) {
  await verifySession();

  await prisma.siteVisit.update({
    where: { id: siteVisitId },
    data: { transcriptionStatus: "PROCESSING", transcriptionError: null },
  });

  revalidatePath(`/jobs/${jobId}`);
  return siteVisitId;
}

export async function updateTranscript(siteVisitId: string, formData: FormData) {
  await verifySession();

  const transcript = formData.get("transcript");
  if (typeof transcript !== "string") {
    throw new Error("Invalid transcript.");
  }

  const siteVisit = await prisma.siteVisit.update({
    where: { id: siteVisitId },
    data: { transcript },
  });

  revalidatePath(`/jobs/${siteVisit.jobId}`);
}
