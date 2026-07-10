import { auth } from "@clerk/nextjs/server";
import { elevenlabs } from "@/lib/elevenlabs/client";

interface VoiceResult {
  id: string;
  name: string;
  category: string;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await elevenlabs.voices.search();
    const voices = (response.voices ?? []).map<VoiceResult>((voice) => ({
      id: voice.voiceId,
      name: voice.name ?? "Unnamed voice",
      category: voice.category ?? "unknown",
    }));

    return Response.json({ voices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch voices";
    return Response.json({ error: message }, { status: 502 });
  }
}
