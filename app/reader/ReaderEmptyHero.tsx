"use client";

import { BookOpen, Brain, BarChart3, Upload, Zap } from "lucide-react";
import { openNewDocument } from "@/lib/reader/newDocumentEvents";

interface ReaderEmptyHeroProps {
  insight: string | null;
  dueReviewCount: number;
  reviewHref?: string;
}

const FEATURES = [
  {
    icon: Zap,
    title: "Read Faster",
    body: "Build serious reading speed",
  },
  {
    icon: Brain,
    title: "Learn Smarter",
    body: "Turn knowledge into retention",
  },
  {
    icon: BarChart3,
    title: "Track Progress",
    body: "See real, measurable growth",
  },
] as const;

/** Editorial empty state — Apple × Linear × ChatGPT monochrome. */
export function ReaderEmptyHero({
  insight,
  dueReviewCount,
  reviewHref = "/reader/games/memory",
}: ReaderEmptyHeroProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          <BookOpen size={56} strokeWidth={1.5} className="text-black" aria-hidden />
        </div>

        <h1 className="font-serif text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] text-black sm:text-[48px]">
          Select a document to start reading
        </h1>

        <p className="mx-auto mt-5 max-w-md text-[16px] leading-7 text-neutral-500 sm:text-[17px]">
          Choose something from your library on the left, or add a new document to get started.
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

        <div className="mt-16">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-200" />
            <p className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
              Why Brainiac?
            </p>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <Icon className="h-6 w-6 text-black" strokeWidth={1.6} aria-hidden />
                <p className="mt-4 text-sm font-semibold text-black">{title}</p>
                <p className="mt-1.5 text-sm text-neutral-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
