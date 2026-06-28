/** Default reading area shown until a document is selected or created. */
export default function ReaderPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Select a document to start reading</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Choose something from your library on the left, or add a new document to get started.
      </p>
    </div>
  );
}
