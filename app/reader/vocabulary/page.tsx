import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { VocabularyWord } from "@prisma/client";

export default async function VocabularyPage() {
  const { userId } = await auth();

  const words = userId
    ? await prisma.vocabularyWord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    : [];

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
    </div>
  );
}
