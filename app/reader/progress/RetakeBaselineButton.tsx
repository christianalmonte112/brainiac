"use client";

import { useTransition } from "react";
import { retakeBaselineAssessment } from "@/app/onboarding/assessment/actions";

interface RetakeBaselineButtonProps {
  className?: string;
  label?: string;
}

/** Clears bad/skip-through baseline and sends the user back to the assessment. */
export function RetakeBaselineButton({
  className,
  label = "Retake baseline assessment",
}: RetakeBaselineButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (
          !window.confirm(
            "Retake the baseline? This clears your current baseline scores so Progress can measure against a real reading pace.",
          )
        ) {
          return;
        }
        startTransition(() => {
          void retakeBaselineAssessment();
        });
      }}
      className={
        className ??
        "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      }
    >
      {isPending ? "Starting…" : label}
    </button>
  );
}
