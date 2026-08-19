/**
 * Free on-device OCR via Tesseract.js (no Anthropic / no API key).
 * Used for photo → text so book pages aren't blocked by Claude's
 * "verbatim reproduction" content filter.
 */

import { normalizeOcrText } from "./normalizeOcrText";

export async function ocrPageImages(
  files: File[],
  onProgress?: (label: string) => void,
): Promise<string> {
  if (files.length === 0) {
    throw new Error("At least one image is required.");
  }

  const { createWorker, PSM } = await import("tesseract.js");
  onProgress?.("Loading OCR…");
  const worker = await createWorker("eng");

  try {
    // Uniform text block — better for a photo of a book page than auto page segmentation.
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });

    const pages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      onProgress?.(
        files.length === 1 ? "Reading photo…" : `Reading page ${i + 1} of ${files.length}…`,
      );
      const {
        data: { text },
      } = await worker.recognize(file);
      const cleaned = normalizeOcrText(text);
      if (cleaned) pages.push(cleaned);
    }

    const joined = normalizeOcrText(pages.join("\n\n"));
    if (!joined) {
      throw new Error("Couldn't find any readable text in those photos. Try a clearer, well-lit shot.");
    }
    return joined;
  } finally {
    await worker.terminate();
  }
}
