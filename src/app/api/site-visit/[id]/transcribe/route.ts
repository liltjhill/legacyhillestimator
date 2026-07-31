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

// OpenAI's transcription API hard limit. Enforced here rather than at
// upload/storage time, so a recording that's too big to transcribe can
// still be uploaded and stored - it just needs to be trimmed before it'll
// transcribe successfully.
const MAX_TRANSCRIBABLE_BYTES = 25 * 1024 * 1024;

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

    if (buffer.byteLength > MAX_TRANSCRIBABLE_BYTES) {
      const mb = (buffer.byteLength / (1024 * 1024)).toFixed(1);
      throw new Error(
        `This recording is ${mb}MB, which is over OpenAI's 25MB transcription limit. ` +
          `Trim it or split it into shorter parts and upload those instead.`,
      );
    }

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
