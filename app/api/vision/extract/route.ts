import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { extractTextWithGoogleVision, isGoogleVisionConfigured } from "@/lib/google/visionOcr";

export const maxDuration = 60;

// Client prepares images; stay under Vercel's ~4.5MB request body cap.
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;
const MAX_IMAGES = 10;
const ACCEPTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

type AcceptedMediaType = (typeof ACCEPTED_MEDIA_TYPES)[number];

function isAcceptedMediaType(type: string): type is AcceptedMediaType {
  return (ACCEPTED_MEDIA_TYPES as readonly string[]).includes(type);
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isGoogleVisionConfigured()) {
      return Response.json(
        {
          error: "Google Vision is not configured on this server.",
          code: "VISION_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    try {
      const rateLimitResponse = await checkRateLimit("aiGeneration", userId);
      if (rateLimitResponse) return rateLimitResponse;
    } catch {
      // Fail open if Upstash isn't configured.
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "Invalid form data" }, { status: 400 });
    }

    const files = formData.getAll("images").filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return Response.json({ error: "At least one image is required." }, { status: 400 });
    }
    if (files.length > MAX_IMAGES) {
      return Response.json({ error: `Please upload ${MAX_IMAGES} pages or fewer at a time.` }, { status: 400 });
    }

    for (const file of files) {
      if (file.size === 0) {
        return Response.json({ error: `${file.name} is empty.` }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return Response.json(
          { error: `${file.name} is too large (3.5MB max per photo). Try a closer crop.` },
          { status: 400 },
        );
      }
      if (!isAcceptedMediaType(file.type)) {
        return Response.json(
          { error: `${file.name} isn't a supported image type. Use JPEG, PNG, WebP, or GIF.` },
          { status: 400 },
        );
      }
    }

    const images = await Promise.all(
      files.map(async (file) => ({
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      })),
    );

    const text = await extractTextWithGoogleVision(images);

    if (!text) {
      return Response.json(
        { error: "Couldn't find any readable text in those photos. Try clearer, well-lit shots." },
        { status: 422 },
      );
    }

    return Response.json({ text, pagesProcessed: files.length, provider: "google-vision" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text extraction failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
