import { BADGE_DEFINITIONS } from "@/lib/badges/definitions";

interface BadgeShelfProps {
  earnedKeys: Set<string>;
}

/**
 * Shows the full badge catalog, not just earned ones — an all-locked view
 * gives a new user zero sense of what's achievable, so every badge always
 * renders; earned ones are highlighted, locked ones are dimmed but still
 * legible (description shown as real text, not hidden behind a hover-only
 * tooltip, since that doesn't work on mobile touch).
 */
export function BadgeShelf({ earnedKeys }: BadgeShelfProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BADGE_DEFINITIONS.map((badge) => {
        const earned = earnedKeys.has(badge.key);
        return (
          <div
            key={badge.key}
            className={`flex flex-col gap-1 rounded-xl border p-3 ${
              earned ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-400"
            }`}
          >
            <span className={`text-2xl ${earned ? "" : "grayscale opacity-50"}`} aria-hidden="true">
              {badge.icon}
            </span>
            <p className={`text-sm font-semibold ${earned ? "text-white" : "text-slate-500"}`}>{badge.label}</p>
            <p className={`text-xs ${earned ? "text-slate-300" : "text-slate-400"}`}>{badge.description}</p>
          </div>
        );
      })}
    </div>
  );
}
