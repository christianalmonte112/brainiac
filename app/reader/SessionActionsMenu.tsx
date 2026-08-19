"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal, Pin, Trash2 } from "lucide-react";
import { deleteReadingSession, togglePinReadingSession } from "./actions";

interface SessionActionsMenuProps {
  sessionId: string;
  title: string;
  pinned: boolean;
}

/** ⋮ menu on a library row — Pin / Unpin and Delete (with confirm). */
export function SessionActionsMenu({ sessionId, title, pinned }: SessionActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative pr-1"
      // Mobile drawer wraps the list in an onClick-to-close handler.
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`Actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 md:invisible md:group-hover:visible"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-1 top-9 z-30 min-w-[9.5rem] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
        >
          <form action={togglePinReadingSession}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <button
              type="submit"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            >
              <Pin className="h-3.5 w-3.5" strokeWidth={1.75} />
              {pinned ? "Unpin" : "Pin"}
            </button>
          </form>
          <form
            action={deleteReadingSession}
            onSubmit={(event) => {
              if (!window.confirm(`Delete “${title}”? This can’t be undone.`)) {
                event.preventDefault();
                return;
              }
              setOpen(false);
            }}
          >
            <input type="hidden" name="sessionId" value={sessionId} />
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Delete
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
