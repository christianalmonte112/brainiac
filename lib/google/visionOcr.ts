import { normalizeOcrText } from "../reader/normalizeOcrText";

export type VisionImageInput = {
  base64: string;
};

type VisionAnnotateResponse = {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string; status?: string };
  }>;
  error?: { message?: string; status?: string; code?: number };
};

export function isGoogleVisionConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim());
}

function pickText(item: NonNullable<VisionAnnotateResponse["responses"]>[number]): string {
  return (
    item.fullTextAnnotation?.text?.trim() ||
    item.textAnnotations?.[0]?.description?.trim() ||
    ""
  );
}

/**
 * Extract printed text from one or more page photos via Google Cloud Vision.
 * Requests DOCUMENT_TEXT_DETECTION (dense pages) and falls back to TEXT_DETECTION
 * per image when document mode returns nothing.
 */
export async function extractTextWithGoogleVision(images: VisionImageInput[]): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_CLOUD_VISION_API_KEY is not set");
  }
  if (images.length === 0) {
    throw new Error("At least one image is required.");
  }

  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: images.map((image) => ({
        image: { content: image.base64 },
        features: [
          { type: "DOCUMENT_TEXT_DETECTION" },
          { type: "TEXT_DETECTION" },
        ],
        imageContext: { languageHints: ["en"] },
      })),
    }),
  });

  const raw = (await response.json()) as VisionAnnotateResponse;

  if (!response.ok || raw.error) {
    const message = raw.error?.message ?? `Google Vision HTTP ${response.status}`;
    throw new Error(message);
  }

  const pages: string[] = [];
  for (const item of raw.responses ?? []) {
    if (item.error?.message) {
      throw new Error(item.error.message);
    }
    const text = pickText(item);
    if (text) pages.push(text);
  }

  // Light reflow only — Vision already returns usable line breaks.
  return normalizeOcrText(pages.join("\n\n"));
}
