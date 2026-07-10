import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * ElevenLabs client singleton.
 *
 * Mirrors our other server-side clients so hot reload in development doesn't
 * create a fresh SDK client instance on every module reload.
 */
declare global {
  var elevenlabsGlobal: ElevenLabsClient | undefined;
}

export const elevenlabs =
  globalThis.elevenlabsGlobal ??
  new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.elevenlabsGlobal = elevenlabs;
}
