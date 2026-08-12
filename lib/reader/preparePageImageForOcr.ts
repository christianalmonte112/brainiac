/**
 * Client-side image prep for on-device Tesseract OCR.
 * Keeps higher resolution than the old upload compressor and applies a light
 * grayscale/contrast pass so phone photos of book pages read more cleanly.
 */

import { scaledDimensions } from "./compressPageImage";

/** Higher than the upload compressor — OCR quality needs the detail. */
export const MAX_OCR_EDGE_PX = 2400;
export const OCR_JPEG_QUALITY = 0.92;

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

/**
 * Downscale (mildly), convert to contrast-boosted grayscale JPEG for OCR.
 */
export async function preparePageImageForOcr(file: File): Promise<File> {
  const img = await loadImageElement(file);
  const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight, MAX_OCR_EDGE_PX);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare that photo for OCR.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Mild contrast boost in grayscale — helps Tesseract on dim phone photos.
  const imageData = ctx.getImageData(0, 0, width, height);
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

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", OCR_JPEG_QUALITY),
  );
  if (!blob) throw new Error("Couldn't prepare that photo for OCR.");

  const base = file.name.replace(/\.[^.]+$/, "") || "page";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
