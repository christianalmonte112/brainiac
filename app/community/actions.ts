"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createCommentSchema,
  createPostSchema,
  deleteCommentSchema,
  deletePostSchema,
  type CreateCommentInput,
} from "@/lib/community/schema";

export interface CreatePostActionState {
  error?: string;
}

/** Creates a post from the /community/new form and redirects to it. */
export async function createPost(
  _prevState: CreatePostActionState,
  formData: FormData,
): Promise<CreatePostActionState> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = createPostSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const post = await prisma.communityPost.create({
    data: { userId, title: parsed.data.title, body: parsed.data.body },
    select: { id: true },
  });

  revalidatePath("/community");
  redirect(`/community/${post.id}`);
}

/** Adds a comment (top-level or reply) to a post the caller can see. */
export async function createComment(args: CreateCommentInput): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = createCommentSchema.safeParse(args);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: parsed.data.postId },
    select: { id: true },
  });
  if (!post) {
    return { error: "Post not found." };
  }

  // A reply's parent must belong to the same post — otherwise a crafted
  // request could graft a comment onto an unrelated thread.
  if (parsed.data.parentId) {
    const parent = await prisma.communityComment.findUnique({
      where: { id: parsed.data.parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== parsed.data.postId) {
      return { error: "That comment no longer exists." };
    }
  }

  await prisma.communityComment.create({
    data: {
      postId: parsed.data.postId,
      userId,
      parentId: parsed.data.parentId ?? null,
      body: parsed.data.body,
    },
  });

  revalidatePath(`/community/${parsed.data.postId}`);
  return {};
}

/** Deletes the caller's own post (comments cascade at the DB level). */
export async function deleteOwnPost(args: { postId: string }): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = deletePostSchema.parse(args);
  const post = await prisma.communityPost.findUnique({
    where: { id: parsed.postId },
    select: { userId: true },
  });
  if (!post || post.userId !== userId) {
    throw new Error("Post not found.");
  }

  await prisma.communityPost.delete({ where: { id: parsed.postId } });
  revalidatePath("/community");
  redirect("/community");
}

/**
 * Deletes the caller's own comment. Replies cascade with it — the
 * documented MVP tradeoff (see CommunityComment in prisma/schema.prisma).
 */
export async function deleteOwnComment(args: { commentId: string }): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const parsed = deleteCommentSchema.parse(args);
  const comment = await prisma.communityComment.findUnique({
    where: { id: parsed.commentId },
    select: { userId: true, postId: true },
  });
  if (!comment || comment.userId !== userId) {
    return { error: "Comment not found." };
  }

  await prisma.communityComment.delete({ where: { id: parsed.commentId } });
  revalidatePath(`/community/${comment.postId}`);
  return {};
}
