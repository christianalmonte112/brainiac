"use client";

import { useState } from "react";
import { deleteOwnPost } from "../actions";

/** Owner-only post deletion (F-016) — the server action re-verifies ownership. */
export function DeletePostButton({ postId }: { postId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (isDeleting) return;
    if (!window.confirm("Delete this post and all its comments?")) return;
    setIsDeleting(true);
    // Deliberately NOT wrapped in try/catch: the action redirects to
    // /community on success, and Next surfaces that as a thrown
    // NEXT_REDIRECT — catching it would swallow the navigation.
    await deleteOwnPost({ postId });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDeleting ? "Deleting…" : "Delete post"}
    </button>
  );
}
