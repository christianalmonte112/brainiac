"use client";

import { useActionState } from "react";
import { createPost, type CreatePostActionState } from "../actions";

const initialState: CreatePostActionState = {};

/** New community post form (F-016) — mirrors the NewSessionForm action pattern. */
export function NewPostForm() {
  const [state, formAction, isPending] = useActionState(createPost, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="title"
        placeholder="Title"
        required
        maxLength={200}
        className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />
      <textarea
        name="body"
        placeholder="What do you want to share? A book that changed how you read, a question, a milestone…"
        required
        rows={8}
        maxLength={10000}
        className="resize-none rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isPending ? "Posting…" : "Post"}
      </button>
    </form>
  );
}
