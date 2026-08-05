"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, FileText, Gauge, Upload } from "lucide-react";
import { openNewDocument } from "@/lib/reader/newDocumentEvents";

interface ReaderEmptyHeroProps {
  baselineWPM: number | null;
  showBaselineCard: boolean;
  insight: string | null;
  dueReviewCount: number;
  reviewHref?: string;
}

/** Editorial empty state — Apple × Linear × ChatGPT monochrome. */
export function ReaderEmptyHero({
  baselineWPM,
  showBaselineCard,
  insight,
  dueReviewCount,
  reviewHref = "/reader/games/memory",
}: ReaderEmptyHeroProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function choose(mode: "paste" | "photos") {
    setMenuOpen(false);
    openNewDocument({ mode });
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#FAFAFA] px-6 py-12">
      <div className="w-full max-w-xl text-center">
        <div className="mb-8 flex justify-center">
          <BookOpen size={56} strokeWidth={1.6} className="text-black" aria-hidden />
        </div>

        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.05em] text-black sm:text-[54px] sm:leading-[58px]">
          Select a document
          <br />
          to start reading
        </h1>

        <p className="mx-auto mt-6 max-w-md text-[17px] leading-8 text-neutral-500 sm:text-[18px]">
          Choose something from your library or create a new document to begin.
        </p>

        <div className="relative mt-12 flex justify-center" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="group flex items-center gap-3 rounded-2xl bg-black px-8 py-4 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
          >
            <span className="text-xl leading-none">＋</span>
            <span className="font-medium">New Document</span>
            <ChevronDown size={18} className="opacity-70 group-hover:opacity-100" />
          </button>

          {menuOpen && (
            <div className="absolute top-full z-20 mt-2 w-[min(360px,calc(100vw-3rem))] rounded-2xl border border-neutral-200 bg-white p-2 text-left shadow-xl">
              <button
                type="button"
                onClick={() => choose("paste")}
                className="flex w-full items-start gap-4 rounded-xl p-4 transition-colors hover:bg-neutral-50"
              >
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-black" />
                <div>
                  <p className="font-medium text-black">Paste Text</p>
                  <p className="text-sm text-neutral-500">Paste or type your content</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => choose("photos")}
                className="flex w-full items-start gap-4 rounded-xl p-4 transition-colors hover:bg-neutral-50"
              >
                <Upload className="mt-0.5 h-5 w-5 shrink-0 text-black" />
                <div>
                  <p className="font-medium text-black">Upload photos</p>
                  <p className="text-sm text-neutral-500">Scan pages with your camera</p>
                </div>
              </button>
            </div>
          )}
        </div>

        {showBaselineCard && baselineWPM !== null && (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
            <div className="flex items-start gap-3">
              <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />
              <div>
                <p className="text-[15px] font-semibold text-black">Baseline reading speed: {baselineWPM} WPM</p>
                <p className="mt-1 text-sm text-neutral-500">Paste ~500 words to begin.</p>
              </div>
            </div>
          </div>
        )}

        {insight && (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-neutral-200 bg-white p-6 text-left shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
            <p className="text-[15px] text-neutral-700">
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
          </div>
        )}
      </div>
    </div>
  );
}
