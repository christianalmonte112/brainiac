"use client";

import { useRef, useState } from "react";
import { preparePageImageForOcr } from "@/lib/reader/preparePageImageForOcr";
import { ocrPageImages } from "@/lib/reader/ocrPageImages";

interface ImagePageUploadProps {
  /** Called with the transcribed text once extraction succeeds. Replaces the
   * caller's current draft rather than appending — if the user re-extracts
   * after editing, the edit is discarded. Acceptable for a first pass; a
   * "keep both" merge can be added later if it's requested. */
  onExtracted: (text: string) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"];
const FILE_PICKER_ACCEPT = [...ACCEPTED_TYPES, ...ACCEPTED_EXTENSIONS].join(",");
const MAX_IMAGES = 10;

interface SelectedImage {
  file: File;
  previewUrl: string;
}

function isAcceptedImage(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

async function readExtractResponse(response: Response): Promise<{
  text?: string;
  error?: string;
  code?: string;
  provider?: string;
}> {
  const raw = await response.text();
  if (!raw.trim()) {
    return { error: `Couldn't reach the text extractor (HTTP ${response.status || "unknown"}).` };
  }
  try {
    return JSON.parse(raw) as { text?: string; error?: string; code?: string; provider?: string };
  } catch {
    return { error: `Text extraction failed (HTTP ${response.status}).` };
  }
}

export function ImagePageUpload({ onExtracted, disabled = false }: ImagePageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const incoming = Array.from(fileList);
    const rejected = incoming.filter((file) => !isAcceptedImage(file));
    const accepted = incoming.filter((file) => isAcceptedImage(file));

    setImages((prev) => {
      const combined = [...prev, ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
      if (combined.length > MAX_IMAGES) {
        setError(`You can upload up to ${MAX_IMAGES} pages at a time — only the first ${MAX_IMAGES} were kept.`);
        return combined.slice(0, MAX_IMAGES);
      }
      return combined;
    });

    if (rejected.length > 0) {
      setError(
        `${rejected.length} file(s) skipped — use JPEG, PNG, WebP, or GIF (HEIC works in Safari; otherwise export as JPEG).`,
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  async function extractWithGoogleVision(prepared: File[]): Promise<string | null> {
    setStatusLabel("Reading with Google Vision…");
    const body = new FormData();
    for (const file of prepared) {
      body.append("images", file);
    }

    const response = await fetch("/api/vision/extract", { method: "POST", body });
    const data = await readExtractResponse(response);

    if (data.code === "VISION_NOT_CONFIGURED" || response.status === 503) {
      return null; // caller falls back to on-device OCR
    }

    if (!response.ok || !data.text) {
      throw new Error(data.error ?? `HTTP ${response.status}`);
    }

    return data.text;
  }

  async function handleExtract() {
    if (images.length === 0) return;
    setIsExtracting(true);
    setError(null);
    setStatusLabel("Preparing photos…");

    try {
      const prepared: File[] = [];
      for (const { file } of images) {
        prepared.push(await preparePageImageForOcr(file));
      }

      let text: string | null = null;
      try {
        text = await extractWithGoogleVision(prepared);
      } catch (err) {
        // Network/API failure — try on-device OCR before surfacing the error.
        console.warn("Google Vision extract failed, falling back to Tesseract:", err);
      }

      if (!text) {
        setStatusLabel("Google Vision unavailable — using on-device OCR…");
        text = await ocrPageImages(prepared, setStatusLabel);
      }

      onExtracted(text);
      for (const { previewUrl } of images) URL.revokeObjectURL(previewUrl);
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't extract text from those photos. Please try again.");
    } finally {
      setIsExtracting(false);
      setStatusLabel(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isExtracting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          📷 Choose photos
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_PICKER_ACCEPT}
          multiple
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />
        <span className="text-xs text-slate-500">
          {images.length > 0
            ? `${images.length} page${images.length === 1 ? "" : "s"} selected · Google Vision OCR`
            : "Up to 10 pages · Google Vision OCR (Tesseract fallback)"}
        </span>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div key={image.previewUrl} className="group relative h-20 w-16 overflow-hidden rounded-md border border-slate-300">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote asset */}
              <img src={image.previewUrl} alt={`Page ${index + 1}`} className="h-full w-full object-cover" />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] font-medium text-white">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={isExtracting}
                aria-label={`Remove page ${index + 1}`}
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-[10px] leading-none text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <button
          type="button"
          onClick={handleExtract}
          disabled={disabled || isExtracting}
          className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExtracting
            ? (statusLabel ?? "Reading photos…")
            : `Extract text from ${images.length} photo${images.length === 1 ? "" : "s"}`}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
