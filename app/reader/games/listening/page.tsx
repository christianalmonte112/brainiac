import { ListeningGameFlow } from "./ListeningGameFlow";

/** Listening games (F-015) — lyrics are pasted by the user by design. */
export default function ListeningGamePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Listening game</h1>
        <p className="mt-1 text-sm text-slate-500">
          Turn song lyrics into a listening comprehension workout: hear each segment, fill the blanks, answer the
          question.
        </p>
      </div>
      <ListeningGameFlow />
    </div>
  );
}
