/**
 * Pure comment-threading for F-016. Takes the flat, chronologically ordered
 * comment list a post query returns and folds it into a tree for rendering.
 * Kept pure so it's unit-testable (thread.test.ts) and shareable between
 * server and client components.
 */

export interface ThreadableComment {
  id: string;
  parentId: string | null;
}

export interface ThreadNode<T extends ThreadableComment> {
  comment: T;
  children: ThreadNode<T>[];
}

/**
 * Builds a tree from a flat list. Input order is preserved among siblings
 * (pass comments sorted by createdAt asc for oldest-first threads). A
 * comment whose parent is missing from the list — e.g. the parent was
 * deleted between fetch and render — is promoted to a root rather than
 * dropped, so no reply ever silently vanishes.
 */
export function buildCommentTree<T extends ThreadableComment>(comments: T[]): ThreadNode<T>[] {
  const nodes = new Map<string, ThreadNode<T>>();
  comments.forEach((comment) => {
    nodes.set(comment.id, { comment, children: [] });
  });

  const roots: ThreadNode<T>[] = [];
  comments.forEach((comment) => {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
