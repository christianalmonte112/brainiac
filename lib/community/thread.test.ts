import { describe, expect, it } from "vitest";
import { buildCommentTree } from "./thread";

function c(id: string, parentId: string | null) {
  return { id, parentId };
}

describe("buildCommentTree", () => {
  it("nests replies under their parents and keeps sibling order", () => {
    const tree = buildCommentTree([c("a", null), c("b", null), c("a1", "a"), c("a2", "a"), c("a1x", "a1")]);

    expect(tree.map((n) => n.comment.id)).toEqual(["a", "b"]);
    expect(tree[0]!.children.map((n) => n.comment.id)).toEqual(["a1", "a2"]);
    expect(tree[0]!.children[0]!.children.map((n) => n.comment.id)).toEqual(["a1x"]);
    expect(tree[1]!.children).toEqual([]);
  });

  it("promotes orphans (deleted parent) to roots instead of dropping them", () => {
    const tree = buildCommentTree([c("a", null), c("ghost-child", "deleted-parent")]);
    expect(tree.map((n) => n.comment.id)).toEqual(["a", "ghost-child"]);
  });

  it("handles an empty list and a self-referencing cycle without hanging", () => {
    expect(buildCommentTree([])).toEqual([]);
    const weird = buildCommentTree([c("loop", "loop")]);
    expect(weird.map((n) => n.comment.id)).toEqual(["loop"]);
  });
});
