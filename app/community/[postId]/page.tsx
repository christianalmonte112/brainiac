import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CommentSection, type ThreadComment } from "./CommentSection";
import { DeletePostButton } from "./DeletePostButton";

interface CommunityPostPageProps {
  params: Promise<{ postId: string }>;
}

/** Post detail + threaded comments (F-016 MVP). */
export default async function CommunityPostPage({ params }: CommunityPostPageProps) {
  const { postId } = await params;
  const { userId } = await auth();

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      title: true,
      body: true,
      createdAt: true,
      user: { select: { name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          parentId: true,
          userId: true,
          body: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!post) {
    notFound();
  }

  interface FetchedComment {
    id: string;
    parentId: string | null;
    userId: string;
    body: string;
    createdAt: Date;
    user: { name: string | null };
  }

  // Serialize for the client thread component (dates preformatted to avoid
  // locale/timezone hydration mismatches).
  const comments: ThreadComment[] = (post.comments as FetchedComment[]).map((comment) => ({
    id: comment.id,
    parentId: comment.parentId,
    userId: comment.userId,
    body: comment.body,
    authorName: comment.user.name ?? "Reader",
    createdLabel: comment.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/community" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Community
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          {userId === post.userId && <DeletePostButton postId={post.id} />}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {post.user.name ?? "Reader"} ·{" "}
          {post.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">{post.body}</div>

      <hr className="border-slate-200" />

      <CommentSection postId={post.id} comments={comments} ownUserId={userId ?? ""} />
    </div>
  );
}
