"use client";

import { useState } from "react";
import { deleteOwnPost } from "../actions";

/** Owner-only post deletion (F-016) — the server action re-verifies ownership. */
export function DeletePostButton({ postId }: { postId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (isDeleting) return;
    if (!window.confirm("Delete this post and all its comments?")) return;
    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteOwnPost({ postId });
      // Successful deletes redirect; if we get a result, it's an error payload.
      if (result?.error) {
        setError(result.error);
        setIsDeleting(false);
      }
    } catch (err) {
      // Next.js surfaces redirect() as a thrown NEXT_REDIRECT — rethrow so navigation proceeds.
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError("Couldn't delete that post. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "Deleting…" : "Delete post"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
