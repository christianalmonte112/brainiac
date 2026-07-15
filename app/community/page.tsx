import Link from "next/link";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;
const PREVIEW_CHARS = 180;

interface CommunityFeedPageProps {
  searchParams?: Promise<{ page?: string }> | { page?: string };
}

interface FeedPost {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  user: { name: string | null };
  _count: { comments: number };
}

/** Community feed (F-016 MVP): newest posts first, page-numbered like the vocabulary bank. */
export default async function CommunityFeedPage({ searchParams }: CommunityFeedPageProps) {
  const resolved =
    searchParams && typeof (searchParams as Promise<{ page?: string }>).then === "function"
      ? await (searchParams as Promise<{ page?: string }>)
      : ((searchParams as { page?: string } | undefined) ?? {});
  const page = Math.max(1, Number.parseInt(resolved.page ?? "1", 10) || 1);

  // Fetch one extra row to know whether a next page exists without a COUNT.
  const rows: FeedPost[] = await prisma.communityPost.findMany({
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
      user: { select: { name: true } },
      _count: { select: { comments: true } },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const posts = rows.slice(0, PAGE_SIZE);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community</h1>
          <p className="mt-1 text-sm text-slate-500">Reading recommendations, questions, and wins from other readers.</p>
        </div>
        <Link
          href="/community/new"
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-sm text-slate-500">
            {page === 1 ? "Nothing here yet — start the first conversation." : "No more posts."}
          </p>
          {page === 1 && (
            <Link href="/community/new" className="mt-2 inline-block text-sm font-medium text-slate-900 underline">
              Write the first post
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/community/${post.id}`}
              className="rounded-xl border border-slate-200 p-5 transition-colors hover:border-slate-400"
            >
              <h2 className="font-semibold text-slate-900">{post.title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {post.body.length > PREVIEW_CHARS ? `${post.body.slice(0, PREVIEW_CHARS)}…` : post.body}
              </p>
              <p className="mt-3 text-xs text-slate-400">
                {post.user.name ?? "Reader"} · {post.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                {post._count.comments} comment{post._count.comments === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/community?page=${page - 1}`} className="font-medium text-slate-600 hover:text-slate-900">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={`/community?page=${page + 1}`} className="font-medium text-slate-600 hover:text-slate-900">
              Older →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
