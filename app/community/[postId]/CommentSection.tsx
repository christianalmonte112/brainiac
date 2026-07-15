"use client";

import { useState } from "react";
import { buildCommentTree, type ThreadNode } from "@/lib/community/thread";
import { createComment, deleteOwnComment } from "../actions";

/**
 * Threaded comments (F-016 MVP). The tree is built client-side from the
 * flat list with the pure buildCommentTree helper; replies open an inline
 * form under their parent. Visual indentation caps at 4 levels so deep
 * threads stay readable on narrow screens (nesting itself is unlimited).
 */

export interface ThreadComment {
  id: string;
  parentId: string | null;
  userId: string;
  body: string;
  authorName: string;
  createdLabel: string;
}

const MAX_INDENT_LEVEL = 4;

interface CommentSectionProps {
  postId: string;
  comments: ThreadComment[];
  ownUserId: string;
}

export function CommentSection({ postId, comments, ownUserId }: CommentSectionProps) {
  const tree = buildCommentTree(comments);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {comments.length === 0 ? "No comments yet" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </h2>

      <CommentForm postId={postId} parentId={null} placeholder="Add a comment…" submitLabel="Comment" />

      <div className="flex flex-col gap-4">
        {tree.map((node) => (
          <CommentNode key={node.comment.id} node={node} postId={postId} ownUserId={ownUserId} level={0} />
        ))}
      </div>
    </div>
  );
}

function CommentNode({
  node,
  postId,
  ownUserId,
  level,
}: {
  node: ThreadNode<ThreadComment>;
  postId: string;
  ownUserId: string;
  level: number;
}) {
  const [replying, setReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const comment = node.comment;

  async function handleDelete() {
    if (isDeleting) return;
    if (!window.confirm("Delete this comment? Replies to it will be deleted too.")) return;
    setIsDeleting(true);
    setError(null);
    const result = await deleteOwnComment({ commentId: comment.id });
    if (result.error) {
      setError(result.error);
      setIsDeleting(false);
    }
    // On success the server action revalidates the page — the comment
    // disappears with the refreshed data; no local state to clean up.
  }

  return (
    <div className={level > 0 && level <= MAX_INDENT_LEVEL ? "border-l-2 border-slate-100 pl-4" : ""}>
      <div className={isDeleting ? "opacity-40" : ""}>
        <p className="text-xs text-slate-400">
          <span className="font-medium text-slate-600">{comment.authorName}</span> · {comment.createdLabel}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{comment.body}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs font-medium">
          <button onClick={() => setReplying((v) => !v)} className="text-slate-500 hover:text-slate-900">
            {replying ? "Cancel" : "Reply"}
          </button>
          {comment.userId === ownUserId && (
            <button onClick={handleDelete} disabled={isDeleting} className="text-slate-400 hover:text-red-600">
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {replying && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              placeholder={`Reply to ${comment.authorName}…`}
              submitLabel="Reply"
              onDone={() => setReplying(false)}
            />
          </div>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {node.children.map((child) => (
            <CommentNode key={child.comment.id} node={child} postId={postId} ownUserId={ownUserId} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentForm({
  postId,
  parentId,
  placeholder,
  submitLabel,
  onDone,
}: {
  postId: string;
  parentId: string | null;
  placeholder: string;
  submitLabel: string;
  onDone?: () => void;
}) {
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (isPending || body.trim().length === 0) return;
    setIsPending(true);
    setError(null);
    const result = await createComment({ postId, parentId, body });
    setIsPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody("");
    onDone?.();
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={5000}
        className="resize-none rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={isPending || body.trim().length === 0}
        className="self-start rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        {isPending ? "Posting…" : submitLabel}
      </button>
    </div>
  );
}
