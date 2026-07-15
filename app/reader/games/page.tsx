import Link from "next/link";

/**
 * Games hub — one place to reach all three Phase 4 games (F-013, F-014,
 * F-015), linked from the reader nav. Visual games launch through their
 * own session picker when reached without a sessionId.
 */
export default function GamesHubPage() {
  const games = [
    {
      href: "/reader/games/memory",
      icon: "🃏",
      title: "Memory",
      description: "Flashcard recall of your saved vocabulary on a spaced-repetition schedule.",
    },
    {
      href: "/reader/games/visual",
      icon: "🧩",
      title: "Visual",
      description: "Matching and sequencing exercises generated from documents you've finished.",
    },
    {
      href: "/reader/games/listening",
      icon: "🎧",
      title: "Listening",
      description: "Paste song lyrics, then listen, fill the blanks, and answer questions.",
    },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Games</h1>
        <p className="mt-1 text-sm text-slate-500">Train comprehension, retention, and listening — pick your workout.</p>
      </div>
      <div className="flex flex-col gap-3">
        {games.map((game) => (
          <Link
            key={game.href}
            href={game.href}
            className="flex items-start gap-4 rounded-xl border border-slate-200 p-5 transition-colors hover:border-slate-400"
          >
            <span className="text-2xl">{game.icon}</span>
            <span>
              <span className="block font-semibold text-slate-900">{game.title}</span>
              <span className="mt-0.5 block text-sm text-slate-500">{game.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
