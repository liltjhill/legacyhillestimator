"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { saveAudioFile, readAudioFile } from "@/lib/storage";
import { transcribeAudio } from "@/lib/transcription";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // OpenAI's transcription API limit

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

  const siteVisit = await prisma.siteVisit.create({
    data: {
      jobId,
      audioUrl: url,
      audioFilename: filename,
      transcriptionStatus: "PROCESSING",
    },
  });

  try {
    const buffer = await readAudioFile(url);
    const transcript = await transcribeAudio(buffer, filename);
    await prisma.siteVisit.update({
      where: { id: siteVisit.id },
      data: { transcript, transcriptionStatus: "COMPLETE" },
    });
  } catch (error) {
    await prisma.siteVisit.update({
      where: { id: siteVisit.id },
      data: {
        transcriptionStatus: "FAILED",
        transcriptionError: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
}

export async function retryTranscription(jobId: string, siteVisitId: string) {
  await verifySession();

  const siteVisit = await prisma.siteVisit.findUniqueOrThrow({ where: { id: siteVisitId } });

  await prisma.siteVisit.update({
    where: { id: siteVisitId },
    data: { transcriptionStatus: "PROCESSING", transcriptionError: null },
  });

  try {
    const buffer = await readAudioFile(siteVisit.audioUrl);
    const transcript = await transcribeAudio(buffer, siteVisit.audioFilename ?? "recording");
    await prisma.siteVisit.update({
      where: { id: siteVisitId },
      data: { transcript, transcriptionStatus: "COMPLETE" },
    });
  } catch (error) {
    await prisma.siteVisit.update({
      where: { id: siteVisitId },
      data: {
        transcriptionStatus: "FAILED",
        transcriptionError: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
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
