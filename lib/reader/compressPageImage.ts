/**
 * Client-side prep for vision OCR uploads.
 * Phone page photos are often 5–15MB; Vercel serverless caps the request body
 * around 4.5MB, so we downscale and re-encode as JPEG before POST.
 */

export const MAX_VISION_EDGE_PX = 1600;
export const VISION_JPEG_QUALITY = 0.75;
/** Soft per-file target after compression (keeps multi-page posts under platform limits). */
export const TARGET_VISION_FILE_BYTES = 500_000;

export function scaledDimensions(
  width: number,
  height: number,
  maxEdge: number = MAX_VISION_EDGE_PX,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function blobToFile(blob: Blob, name: string): File {
  const base = name.replace(/\.[^.]+$/, "") || "page";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Couldn't compress that photo. Try a smaller JPEG or PNG.");
  return blob;
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
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
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Downscale + JPEG-encode a page photo for `/api/vision/extract`.
 * Returns the original file when it's already a small enough JPEG.
 */
export async function compressPageImage(file: File): Promise<File> {
  const alreadySmallJpeg = file.type === "image/jpeg" && file.size <= TARGET_VISION_FILE_BYTES;

  const img = await loadImageElement(file);
  const { width, height } = scaledDimensions(img.naturalWidth, img.naturalHeight);

  const needsResize = width !== img.naturalWidth || height !== img.naturalHeight;
  if (alreadySmallJpeg && !needsResize) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare that photo for upload.");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = VISION_JPEG_QUALITY;
  let blob = await encodeCanvas(canvas, quality);

  // Step quality down if still huge (common with dense book-page photos).
  while (blob.size > TARGET_VISION_FILE_BYTES && quality > 0.45) {
    quality = Math.round((quality - 0.1) * 10) / 10;
    blob = await encodeCanvas(canvas, quality);
  }

  return blobToFile(blob, file.name);
}
