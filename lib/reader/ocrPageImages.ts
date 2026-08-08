/**
 * Free on-device OCR via Tesseract.js (no Anthropic / no API key).
 * Used for photo → text so book pages aren't blocked by Claude's
 * "verbatim reproduction" content filter.
 */

export async function ocrPageImages(
  files: File[],
  onProgress?: (label: string) => void,
): Promise<string> {
  if (files.length === 0) {
    throw new Error("At least one image is required.");
  }

  const { createWorker } = await import("tesseract.js");
  onProgress?.("Loading OCR…");
  const worker = await createWorker("eng");

  try {
    const pages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      onProgress?.(
        files.length === 1 ? "Reading photo…" : `Reading page ${i + 1} of ${files.length}…`,
      );
      const {
        data: { text },
      } = await worker.recognize(file);
      const cleaned = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
      if (cleaned) pages.push(cleaned);
    }

    const joined = pages.join("\n\n").trim();
    if (!joined) {
      throw new Error("Couldn't find any readable text in those photos. Try a clearer, well-lit shot.");
    }
    return joined;
  } finally {
    await worker.terminate();
  }
}
