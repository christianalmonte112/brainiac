import { z } from "zod";

/** Inputs for the F-016 community MVP — plain text only by design. */

export const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200, "Title is too long (200 characters max)."),
  body: z.string().trim().min(1, "Say something in the body.").max(10000, "Post is too long (10,000 characters max)."),
});

export const createCommentSchema = z.object({
  postId: z.string().min(1),
  parentId: z.string().min(1).nullable().optional(),
  body: z.string().trim().min(1, "Comment can't be empty.").max(5000, "Comment is too long (5,000 characters max)."),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const deletePostSchema = z.object({ postId: z.string().min(1) });
export const deleteCommentSchema = z.object({ commentId: z.string().min(1) });
