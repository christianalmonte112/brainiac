import { getAnthropic } from "@/lib/ai/client";

export const EXTRACT_PAGE_TEXT_MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You transcribe photos of book/document pages into clean, continuous plain text for a reading app.

Rules:
1. Transcribe the body text exactly as written — do not summarize, correct grammar, or modernize spelling.
2. Preserve paragraph breaks (use a blank line between paragraphs). Do not insert paragraph breaks that aren't in the source.
3. Omit page numbers, running headers/footers, chapter decorations, and scanner artifacts.
4. If multiple images are provided, they are sequential pages of the same document — transcribe them in the order given and join them into one continuous text, without labeling or numbering the pages.
5. If a portion of a page is blurry or unreadable, transcribe everything you can read clearly and skip only the illegible portion — do not refuse or add notes about it, and do not fabricate text you can't actually read.
6. If an image contains no readable body text at all (blank page, cover art, a photo unrelated to a book page), output nothing for that image.

Respond with ONLY the transcribed text. No preamble, no markdown formatting, no commentary, no quotation marks around the output.`;

export type ExtractableImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface ExtractableImage {
  base64: string;
  mediaType: ExtractableImageMediaType;
}

/**
 * Transcribes one or more photographed book/document pages into plain text
 * using Claude's vision capability (F-018). Images are sent in a single
 * request, in order, so multi-page uploads come back as one continuous text
 * rather than requiring the caller to stitch per-page results together.
 *
 * Throws on API failure — unlike scoreChunkSummary, there's no safe fallback
 * text to return here, so the caller (the API route) is responsible for
 * surfacing a clear error to the user rather than silently producing an
 * empty document.
 */
export async function extractTextFromImages(images: ExtractableImage[]): Promise<string> {
  if (images.length === 0) {
    throw new Error("At least one image is required.");
  }

  const message = await getAnthropic().messages.create({
    model: EXTRACT_PAGE_TEXT_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...images.map((image) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: image.mediaType,
              data: image.base64,
            },
          })),
          {
            type: "text" as const,
            text:
              images.length === 1
                ? "Transcribe this page."
                : `Transcribe these ${images.length} pages, in order, as one continuous document.`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0];
  if (!raw || raw.type !== "text") {
    throw new Error("Claude did not return a text response.");
  }

  return raw.text.trim();
}
