import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { VocabularyWord } from "@prisma/client";
import Link from "next/link";

const PAGE_SIZE = 50;

interface VocabularyPageProps {
  searchParams?: Promise<{ page?: string }> | { page?: string };
}

export default async function VocabularyPage({ searchParams }: VocabularyPageProps) {
  const { userId } = await auth();
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<{ page?: string }>).then === "function"
      ? await (searchParams as Promise<{ page?: string }>)
      : ((searchParams as { page?: string } | undefined) ?? {});

  const pageRaw = Number(resolvedSearchParams.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const skip = (page - 1) * PAGE_SIZE;

  const rows = userId
    ? await prisma.vocabularyWord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE + 1,
      })
    : [];
  const hasMore = rows.length > PAGE_SIZE;
  const words = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vocabulary bank</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every word you&apos;ve looked up while reading, saved here automatically.
        </p>
      </div>

      {words.length === 0 ? (
        <p className="text-sm text-slate-500">
          Click any word while reading to look it up — it&apos;ll show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {words.map((entry: VocabularyWord) => (
            <li key={entry.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{entry.word}</h2>
                <span className="text-xs text-slate-400">
                  {[entry.phonetic, entry.partOfSpeech].filter(Boolean).join(" · ")}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{entry.definition}</p>
              {entry.synonyms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {entry.synonyms.map((synonym: string) => (
                    <span key={synonym} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {synonym}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="pt-1">
          <Link
            href={`/reader/vocabulary?page=${page + 1}`}
            className="inline-flex rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Load more
          </Link>
        </div>
      )}
    </div>
  );
}
