/**
 * Rebuild readable page text from Vision DOCUMENT_TEXT_DETECTION geometry
 * instead of trusting fullTextAnnotation.text alone (which can shuffle lines
 * on warped phone photos and leave page numbers in the body).
 */

type Vertex = { x?: number; y?: number };
type BoundingPoly = { vertices?: Vertex[]; normalizedVertices?: Vertex[] };

type VisionSymbol = {
  text?: string;
  property?: { detectedBreak?: { type?: string } };
};

type VisionWord = {
  symbols?: VisionSymbol[];
  boundingBox?: BoundingPoly;
};

type VisionParagraph = {
  words?: VisionWord[];
  boundingBox?: BoundingPoly;
};

type VisionBlock = {
  blockType?: string;
  paragraphs?: VisionParagraph[];
  boundingBox?: BoundingPoly;
};

type VisionPage = {
  width?: number;
  height?: number;
  blocks?: VisionBlock[];
};

export type VisionFullTextAnnotation = {
  text?: string;
  pages?: VisionPage[];
};

function centerOf(box: BoundingPoly | undefined): { x: number; y: number } {
  const verts = box?.vertices?.length ? box.vertices : box?.normalizedVertices;
  if (!verts?.length) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const v of verts) {
    if (typeof v.x === "number" && typeof v.y === "number") {
      sx += v.x;
      sy += v.y;
      n += 1;
    }
  }
  if (n === 0) return { x: 0, y: 0 };
  return { x: sx / n, y: sy / n };
}

function paragraphText(para: VisionParagraph): string {
  let out = "";
  for (const word of para.words ?? []) {
    for (const sym of word.symbols ?? []) {
      out += sym.text ?? "";
      const br = sym.property?.detectedBreak?.type;
      if (br === "SPACE" || br === "SURE_SPACE") out += " ";
      else if (br === "EOL_SURE_SPACE" || br === "LINE_BREAK") out += "\n";
      else if (br === "HYPHEN") out += "-";
    }
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
}

/** Page numbers sit alone as 1–4 digits near the top/bottom margin. */
function isPageNumberNoise(
  text: string,
  box: BoundingPoly | undefined,
  pageWidth: number,
  pageHeight: number,
): boolean {
  const t = text.trim();
  if (!/^\d{1,4}$/.test(t)) return false;
  if (!pageHeight) return true;

  const { y } = centerOf(box);
  // Vision may return absolute pixels or normalized 0–1 coords.
  const cy = y <= 1.5 && pageHeight > 2 ? y * pageHeight : y;
  const margin = pageHeight * 0.14;
  return cy < margin || cy > pageHeight - margin;
}

const SKIP_BLOCK_TYPES = new Set(["PICTURE", "RULER", "BARCODE", "TABLE"]);

/**
 * Prefer geometry-ordered paragraphs; fall back to annotation.text.
 */
export function textFromFullTextAnnotation(annotation: VisionFullTextAnnotation | undefined | null): string {
  if (!annotation) return "";

  const pages = annotation.pages ?? [];
  if (pages.length === 0) {
    return annotation.text?.trim() ?? "";
  }

  const pageTexts: string[] = [];

  for (const page of pages) {
    const pageW = page.width ?? 0;
    const pageH = page.height ?? 0;
    const blocks = [...(page.blocks ?? [])].filter((b) => !SKIP_BLOCK_TYPES.has(b.blockType ?? ""));

    blocks.sort((a, b) => {
      const ac = centerOf(a.boundingBox);
      const bc = centerOf(b.boundingBox);
      const ay = ac.y <= 1.5 && pageH > 2 ? ac.y * pageH : ac.y;
      const by = bc.y <= 1.5 && pageH > 2 ? bc.y * pageH : bc.y;
      // Same visual row → left-to-right; else top-to-bottom.
      if (Math.abs(ay - by) > Math.max(12, pageH * 0.012)) return ay - by;
      const ax = ac.x <= 1.5 && pageW > 2 ? ac.x * pageW : ac.x;
      const bx = bc.x <= 1.5 && pageW > 2 ? bc.x * pageW : bc.x;
      return ax - bx;
    });

    const paragraphs: string[] = [];
    for (const block of blocks) {
      const paras = [...(block.paragraphs ?? [])];
      paras.sort((a, b) => {
        const ay = centerOf(a.boundingBox).y;
        const by = centerOf(b.boundingBox).y;
        if (Math.abs(ay - by) > 8) return ay - by;
        return centerOf(a.boundingBox).x - centerOf(b.boundingBox).x;
      });

      for (const para of paras) {
        const text = paragraphText(para);
        if (!text) continue;
        if (isPageNumberNoise(text, para.boundingBox ?? block.boundingBox, pageW, pageH)) continue;
        paragraphs.push(text);
      }
    }

    if (paragraphs.length > 0) {
      pageTexts.push(paragraphs.join("\n\n"));
    }
  }

  const assembled = pageTexts.join("\n\n").trim();
  return assembled || (annotation.text?.trim() ?? "");
}
