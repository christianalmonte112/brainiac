"use client";

import { useState, useTransition } from "react";
import { READING_SOURCES, READING_TOPICS, type ReadingTopicId } from "@/lib/reading-sources/catalog";
import { filterReadingSources } from "@/lib/reading-sources/filter";
import { openReadingSource } from "./readingSourceActions";

export function ReadingSourceShelf() {
  const [topic, setTopic] = useState<ReadingTopicId>("science");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const results = filterReadingSources(topic, query);
  const searching = query.trim().length > 0;

  function openSource(sourceId: string) {
    setError(null);
    setPendingId(sourceId);
    startTransition(async () => {
      const result = await openReadingSource(sourceId);
      if (result?.error) {
        setError(result.error);
        setPendingId(null);
      }
    });
  }

  return (
    <section className="mt-16 text-left" aria-labelledby="start-reading-heading">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-neutral-200" />
        <h2
          id="start-reading-heading"
          className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400"
        >
          Start reading
        </h2>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Topics">
        {READING_TOPICS.map((entry) => {
          const selected = !searching && topic === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setTopic(entry.id);
                setQuery("");
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                selected ? "bg-black text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <label className="mx-auto mt-6 block max-w-md">
        <span className="sr-only">Find a subject</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a subject"
          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400"
        />
      </label>

      {results.length === 0 ? (
        <p className="mt-8 text-center text-sm text-neutral-500">Nothing on that subject in the shelf yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {results.map((source) => {
            const opening = isPending && pendingId === source.id;
            return (
              <li key={source.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => openSource(source.id)}
                  disabled={isPending}
                  className="w-full text-left disabled:cursor-wait"
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">
                    {READING_TOPICS.find((entry) => entry.id === source.topic)?.label}
                  </span>
                  <span className="mt-1.5 block text-sm font-semibold text-black">
                    {opening ? "Opening…" : source.title}
                  </span>
                  <span className="mt-1 block text-xs text-neutral-500">
                    {source.sourceName} · ~{source.minutes} min
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setQuery(source.subject)}
                  className="mt-3 text-xs font-medium text-black underline decoration-neutral-300 underline-offset-2 hover:decoration-black"
                >
                  More on this subject
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
    </section>
  );
}
