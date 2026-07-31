import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/session";

/**
 * Issues client tokens for direct browser-to-Vercel-Blob uploads. Audio
 * recordings can easily exceed Vercel's serverless function request body
 * limit, so the file bytes never pass through our own server - only this
 * small token exchange does.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*"],
        addRandomSuffix: true,
        // This is a Blob storage ceiling, not OpenAI's transcription limit -
        // don't conflate the two. Whisper's 25MB cap is enforced later, at
        // transcription time, so a longer recording can still be uploaded
        // and stored even if it needs to be trimmed before it can be
        // transcribed.
        maximumSizeInBytes: 200 * 1024 * 1024,
      }),
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
