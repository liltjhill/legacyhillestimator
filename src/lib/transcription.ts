import "server-only";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio(audio: Buffer, filename: string): Promise<string> {
  const apiKey = process.env.TRANSCRIPTION_API_KEY;
  if (!apiKey) {
    throw new Error("TRANSCRIPTION_API_KEY environment variable is not set");
  }

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audio)]), filename);
  formData.append("model", "whisper-1");

  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
}
