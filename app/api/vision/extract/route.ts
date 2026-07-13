import { auth } from "@clerk/nextjs/server";
import { extractTextFromImages, type ExtractableImageMediaType } from "@/lib/prompts/extractPageText";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB per image — plenty for a phone photo of a page.
const MAX_IMAGES = 10; // A chapter's worth of pages in one go; keeps request size/latency reasonable.
const ACCEPTED_MEDIA_TYPES: ExtractableImageMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function isAcceptedMediaType(type: string): type is ExtractableImageMediaType {
  return (ACCEPTED_MEDIA_TYPES as string[]).includes(type);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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
      return Response.json({ error: `${file.name} is too large (10MB max per photo).` }, { status: 400 });
    }
    if (!isAcceptedMediaType(file.type)) {
      return Response.json(
        { error: `${file.name} isn't a supported image type. Use JPEG, PNG, WebP, or GIF.` },
        { status: 400 },
      );
    }
  }

  try {
    const images = await Promise.all(
      files.map(async (file) => ({
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
        mediaType: file.type as ExtractableImageMediaType,
      })),
    );

    const text = await extractTextFromImages(images);

    if (!text) {
      return Response.json(
        { error: "Couldn't find any readable text in those photos. Try clearer, well-lit shots." },
        { status: 422 },
      );
    }

    return Response.json({ text, pagesProcessed: files.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text extraction failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
