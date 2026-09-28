"use client";

import { BookOpen, Upload } from "lucide-react";
import { openNewDocument } from "@/lib/reader/newDocumentEvents";
import { ReadingSourceShelf } from "./ReadingSourceShelf";

interface ReaderEmptyHeroProps {
  insight: string | null;
  dueReviewCount: number;
  reviewHref?: string;
}

/** Editorial empty state — library home with a shelf of open readings. */
export function ReaderEmptyHero({
  insight,
  dueReviewCount,
  reviewHref = "/reader/games/memory",
}: ReaderEmptyHeroProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-8 flex justify-center">
          <BookOpen size={56} strokeWidth={1.5} className="text-black" aria-hidden />
        </div>

        <h1 className="font-serif text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-black sm:text-[48px]">
          Select a document to start reading
        </h1>

        <p className="mx-auto mt-5 max-w-md text-[16px] leading-7 text-neutral-500 sm:text-[17px]">
          Choose something from your library on the left, add a document, or start from a piece below.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openNewDocument({ mode: "paste" })}
            className="inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-3.5 text-sm font-medium text-white transition-all duration-180 hover:-translate-y-0.5 hover:bg-neutral-900 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
          >
            <span className="text-lg leading-none">+</span>
            New Document
          </button>
          <button
            type="button"
            onClick={() => openNewDocument({ mode: "photos" })}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-6 py-3.5 text-sm font-medium text-black transition-all duration-180 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
          >
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            Upload File
          </button>
        </div>

        {insight && (
          <p className="mx-auto mt-8 max-w-md text-sm text-neutral-500">
            {insight}
            {dueReviewCount > 0 && (
              <>
                {" "}
                <a href={reviewHref} className="font-medium text-black underline">
                  Review now →
                </a>
              </>
            )}
          </p>
        )}

        <ReadingSourceShelf />
      </div>
    </div>
  );
}
