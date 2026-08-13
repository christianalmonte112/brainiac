/**
 * Client-side image prep for OCR.
 * - Google Vision: keep color + EXIF orientation, mild downscale, content crop
 *   (drop desk/keyboard margins). Vision hates grayscale/contrast tricks.
 * - Tesseract: grayscale + contrast boost for on-device fallback.
 */

import { scaledDimensions } from "./compressPageImage";

export const MAX_OCR_EDGE_PX = 2400;
export const MAX_VISION_EDGE_PX = 2800;
export const OCR_JPEG_QUALITY = 0.92;
export const VISION_JPEG_QUALITY = 0.95;

/** Ink darker than this counts toward the page content bbox (0–255). */
const CONTENT_LUMA_MAX = 210;
/** Require at least this fraction of the frame before accepting a crop. */
const MIN_CONTENT_AREA_RATIO = 0.18;
const CONTENT_PAD_RATIO = 0.03;

export type ContentBounds = { x: number; y: number; width: number; height: number };

/**
 * Find the bounding box of dark (ink / shadow) pixels so we can crop away
 * desk, keyboard, and stickers around a photographed book page.
 * Exported for unit tests.
 */
export function findContentBounds(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): ContentBounds | null {
  if (width < 8 || height < 8) return null;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let ink = 0;

  // Sample every 2nd pixel for speed on large phone photos.
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma > CONTENT_LUMA_MAX) continue;
      ink += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY || ink < 80) return null;

  const padX = Math.max(4, Math.round(width * CONTENT_PAD_RATIO));
  const padY = Math.max(4, Math.round(height * CONTENT_PAD_RATIO));
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const right = Math.min(width, maxX + padX + 1);
  const bottom = Math.min(height, maxY + padY + 1);
  const w = right - x;
  const h = bottom - y;

  if (w * h < width * height * MIN_CONTENT_AREA_RATIO) return null;
  // Skip near-noop crops (already tight).
  if (w >= width * 0.96 && h >= height * 0.96) return null;

  return { x, y, width: w, height: h };
}

function cropCanvasToContent(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const bounds = findContentBounds(imageData.data, canvas.width, canvas.height);
  if (!bounds) return;

  const cropped = ctx.getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  // Resizing the canvas resets the 2d context — write through a fresh one.
  const next = canvas.getContext("2d");
  if (!next) return;
  next.putImageData(cropped, 0, 0);
}

async function drawFileToCanvas(
  file: File,
  maxEdge: number,
  options?: { cropContent?: boolean },
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  let width: number;
  let height: number;
  let source: CanvasImageSource;

  // Honor EXIF orientation so phone photos aren't sent sideways/upside-down.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      ({ width, height } = scaledDimensions(bitmap.width, bitmap.height, maxEdge));
      source = bitmap;
    } catch {
      source = await loadImageElement(file);
      ({ width, height } = scaledDimensions(
        (source as HTMLImageElement).naturalWidth,
        (source as HTMLImageElement).naturalHeight,
        maxEdge,
      ));
    }
  } else {
    source = await loadImageElement(file);
    ({ width, height } = scaledDimensions(
      (source as HTMLImageElement).naturalWidth,
      (source as HTMLImageElement).naturalHeight,
      maxEdge,
    ));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare that photo for OCR.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    source.close();
  }

  if (options?.cropContent) {
    cropCanvasToContent(canvas, ctx);
  }

  return { canvas, ctx };
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(
          new Error(
            file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")
              ? `${file.name} is HEIC — export it as JPEG in Photos, or try again in Safari.`
              : `Couldn't read ${file.name}. Try JPEG or PNG.`,
          ),
        );
      el.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToJpegFile(canvas: HTMLCanvasElement, name: string, quality: number): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn't prepare that photo for OCR.");
  const base = name.replace(/\.[^.]+$/, "") || "page";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

/**
 * Color JPEG for Google Cloud Vision — no grayscale/contrast (those hurt Vision).
 * Crops to ink bounds so desk/keyboard around the page don't confuse reading order.
 */
export async function preparePageImageForGoogleVision(file: File): Promise<File> {
  const { canvas } = await drawFileToCanvas(file, MAX_VISION_EDGE_PX, { cropContent: true });
  return canvasToJpegFile(canvas, file.name, VISION_JPEG_QUALITY);
}

/**
 * Grayscale + contrast for on-device Tesseract fallback.
 */
export async function preparePageImageForOcr(file: File): Promise<File> {
  const { canvas, ctx } = await drawFileToCanvas(file, MAX_OCR_EDGE_PX);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = 1.25;
  const intercept = 128 * (1 - contrast);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = gray * contrast + intercept;
    gray = Math.min(255, Math.max(0, gray));
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvasToJpegFile(canvas, file.name, OCR_JPEG_QUALITY);
}
