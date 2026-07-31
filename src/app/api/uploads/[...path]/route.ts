import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSession } from "@/lib/session";
import { LOCAL_UPLOADS_DIR } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }

  const { path: segments } = await params;
  const requestedPath = path.join(LOCAL_UPLOADS_DIR, ...segments);

  if (!requestedPath.startsWith(LOCAL_UPLOADS_DIR + path.sep)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const buffer = await readFile(requestedPath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
