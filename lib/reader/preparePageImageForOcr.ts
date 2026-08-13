/**
 * Client-side image prep for OCR.
 * - Google Vision: keep color + EXIF orientation, mild downscale (Vision hates
 *   the grayscale/contrast tricks that help Tesseract).
 * - Tesseract: grayscale + contrast boost for on-device fallback.
 */

import { scaledDimensions } from "./compressPageImage";

export const MAX_OCR_EDGE_PX = 2400;
export const MAX_VISION_EDGE_PX = 2800;
export const OCR_JPEG_QUALITY = 0.92;
export const VISION_JPEG_QUALITY = 0.95;

async function drawFileToCanvas(
  file: File,
  maxEdge: number,
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
 */
export async function preparePageImageForGoogleVision(file: File): Promise<File> {
  const { canvas } = await drawFileToCanvas(file, MAX_VISION_EDGE_PX);
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
