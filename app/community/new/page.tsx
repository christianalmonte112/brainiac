import Link from "next/link";
import { NewPostForm } from "./NewPostForm";

export default function NewCommunityPostPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/community" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Community
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">New post</h1>
      </div>
      <NewPostForm />
    </div>
  );
}
