import { auth } from "@clerk/nextjs/server";
import { getElevenLabsClient } from "@/lib/elevenlabs/client";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "audio file is required" }, { status: 400 });
  }
  if (audio.size === 0) {
    return Response.json({ error: "audio file is empty" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "audio file is too large" }, { status: 400 });
  }

  try {
    const response = await getElevenLabsClient().speechToText.convert({
      modelId: "scribe_v2",
      file: audio,
    });

    const transcribedText =
      typeof (response as { text?: unknown }).text === "string"
        ? (response as { text: string }).text.trim()
        : "";

    if (!transcribedText) {
      return Response.json({ error: "No transcription returned" }, { status: 502 });
    }

    return Response.json({ text: transcribedText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
