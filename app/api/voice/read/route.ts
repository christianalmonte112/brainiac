import { auth } from "@clerk/nextjs/server";
import { getElevenLabsClient } from "@/lib/elevenlabs/client";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const MAX_TTS_CHARS = 4000;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawText = body.text;
  if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const voiceId =
    typeof body.voiceId === "string" && body.voiceId.trim().length > 0
      ? body.voiceId.trim()
      : DEFAULT_VOICE_ID;

  const text = rawText.trim().slice(0, MAX_TTS_CHARS);

  try {
    const audioStream = await getElevenLabsClient().textToSpeech.stream(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
    });

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice generation failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
