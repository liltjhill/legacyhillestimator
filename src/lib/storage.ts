import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "uploads");
const LOCAL_URL_PREFIX = "/api/uploads/";

function usingBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveAudioFile(
  jobId: string,
  file: File,
): Promise<{ url: string; filename: string }> {
  const ext = path.extname(file.name) || ".webm";
  const storedName = `${jobId}/${randomUUID()}${ext}`;

  if (usingBlobStorage()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(storedName, file, { access: "public" });
    return { url: blob.url, filename: file.name };
  }

  const destDir = path.join(LOCAL_UPLOADS_DIR, jobId);
  await mkdir(destDir, { recursive: true });
  const destPath = path.join(LOCAL_UPLOADS_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destPath, buffer);

  return { url: `${LOCAL_URL_PREFIX}${storedName}`, filename: file.name };
}

/** Reads audio file bytes back out for sending to the transcription API. */
export async function readAudioFile(url: string): Promise<Buffer> {
  if (url.startsWith(LOCAL_URL_PREFIX)) {
    const relativePath = url.slice(LOCAL_URL_PREFIX.length);
    const fullPath = path.join(LOCAL_UPLOADS_DIR, relativePath);
    return readFile(fullPath);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio file from ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export { LOCAL_UPLOADS_DIR };
