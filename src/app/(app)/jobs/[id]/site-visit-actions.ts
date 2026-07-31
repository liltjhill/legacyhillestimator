"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { saveAudioFile, readAudioFile } from "@/lib/storage";
import { transcribeAudio } from "@/lib/transcription";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // OpenAI's transcription API limit

/**
 * Does the actual OpenAI call and writes the result. Scheduled via `after()`
 * so it runs after the response is sent - transcribing a multi-minute
 * recording can take longer than a request/response cycle should block on,
 * and doing it inline risked the serverless function being killed mid-call,
 * leaving the row stuck in PROCESSING forever with no way to recover.
 */
async function runTranscription(
  siteVisitId: string,
  jobId: string,
  audioUrl: string,
  filename: string,
) {
  try {
    const buffer = await readAudioFile(audioUrl);
    const transcript = await transcribeAudio(buffer, filename);
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

async function createSiteVisitAndTranscribe(jobId: string, audioUrl: string, filename: string) {
  const siteVisit = await prisma.siteVisit.create({
    data: {
      jobId,
      audioUrl,
      audioFilename: filename,
      transcriptionStatus: "PROCESSING",
    },
  });

  after(() => runTranscription(siteVisit.id, jobId, audioUrl, filename));

  revalidatePath(`/jobs/${jobId}`);
}

/**
 * Local-dev upload path: the audio file travels through the server action's
 * own request body. Vercel's serverless functions cap request bodies well
 * below what a multi-minute recording needs, so production uploads instead
 * go directly from the browser to Vercel Blob (see `uploadSiteVisitFromBlob`
 * and `/api/site-visit/blob-upload`).
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
  await createSiteVisitAndTranscribe(jobId, url, filename);
}

export async function uploadSiteVisitFromBlob(jobId: string, audioUrl: string, filename: string) {
  await verifySession();
  await createSiteVisitAndTranscribe(jobId, audioUrl, filename);
}

export async function retryTranscription(jobId: string, siteVisitId: string) {
  await verifySession();

  const siteVisit = await prisma.siteVisit.findUniqueOrThrow({ where: { id: siteVisitId } });

  await prisma.siteVisit.update({
    where: { id: siteVisitId },
    data: { transcriptionStatus: "PROCESSING", transcriptionError: null },
  });

  after(() =>
    runTranscription(siteVisitId, jobId, siteVisit.audioUrl, siteVisit.audioFilename ?? "recording"),
  );

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
