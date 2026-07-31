import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { readAudioFile } from "@/lib/storage";
import { transcribeAudio } from "@/lib/transcription";

// Runs as its own serverless invocation, triggered fire-and-forget from the
// browser right after an upload (or a retry) - so a long recording gets a
// dedicated time budget instead of sharing the calling request's, which is
// what let this get killed mid-transcription before.
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  const siteVisit = await prisma.siteVisit.findUnique({ where: { id } });
  if (!siteVisit) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const buffer = await readAudioFile(siteVisit.audioUrl);
    const transcript = await transcribeAudio(buffer, siteVisit.audioFilename ?? "recording");
    await prisma.siteVisit.update({
      where: { id },
      data: { transcript, transcriptionStatus: "COMPLETE" },
    });
  } catch (error) {
    await prisma.siteVisit.update({
      where: { id },
      data: {
        transcriptionStatus: "FAILED",
        transcriptionError: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }

  revalidatePath(`/jobs/${siteVisit.jobId}`);

  return NextResponse.json({ ok: true });
}
