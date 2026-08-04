# Brainiac — Phase 4 Explained in Plain English

This document explains what Phase 4 added, what shipped as the intentional
MVP, what was cancelled or deferred on purpose, and how Phase 4 fits between
the AI-heavy Phase 3 work and the beta-hardening of Phase 5. Claims below
were checked against the live product routes and docs, not written from an
old planning draft alone.

---

## What Phase 4 Was About

Phase 3 made Brainiac intelligent (AI scoring, voice, quizzes, OCR, admin).
Phase 4 made it **sticky and social** — practice loops outside the linear
reader, a place to talk with other adult learners, and a progress surface
worth coming back to.

The goal of Phase 4 was to add:

- Three practice games (visual, memory, listening)
- A community MVP (posts + threaded discussion)
- A richer progress dashboard (streaks, insights, badges, share)
- Mobile-usable core flows

It was **not** about building a marketing splash page or a full Reddit clone
with votes and moderation on day one.

---

## F-013 — Visual Learning Games

After finishing a document, readers can practice with games generated from
that session's content.

What shipped:

- Matching and sequencing exercises
- Claude-generated game content per completed session
- Scoring and attempt persistence
- Entry from the completion screen and from `/reader/games/visual`

This turns "I finished the doc" into "I can still train on it."

---

## F-014 — Memory Games

Flashcard recall over vocabulary the reader has saved while reading.

What shipped:

- Due-word batches from a spaced-repetition schedule
- Flip card → self-grade ("Knew it" / "Still learning")
- Server-side review updates that move words forward or keep them due
- Remount-safe state when starting a new review batch (no stale scores
  carried over from the previous round)

This is the retention gym for words looked up in the chunk reader.

---

## F-015 — Listening Games (Song Lyrics)

Readers paste lyrics, then practice listening comprehension.

What shipped:

- Claude breaks lyrics into annotated segments
- ElevenLabs TTS plays each segment
- Fill-in-the-blank + multiple-choice questions per segment
- Graded attempt results vs. baseline-oriented feedback

This extends Brainiac beyond pasted articles into audio/lyric practice.

---

## Games Hub

`/reader/games` is the single entry point for all three games — Memory,
Visual, and Listening — so practice isn't buried inside one session only.

---

## F-016 — Community Platform (MVP)

A signed-in community where adult learners can post and discuss.

**What shipped (MVP):**

- Create text posts
- Threaded comments (replies)
- Delete your own posts and comments (ownership checked on the server)
- Newest-first feed and post detail pages under `/community`

**What was deliberately deferred:**

- Upvote / downvote
- Recommendation lists / ranking feeds
- Moderation (report, hide)

**Why defer votes?** Votes were never required for reading comprehension.
They were "Reddit-style" polish for ranking helpful tips. The MVP already
meets Phase 4's exit criterion: a live community space. Ranking and
moderation move to the Post-MVP backlog until users ask for them.

---

## F-006 — Dashboard & Progress (Phase 4 depth)

Phase 2 introduced the first progress dashboard. Phase 4 made it a real
home base.

What shipped on `/reader/progress`:

- Reading streak and aggregate stats
- "What to work on next" from learning insights
- Baseline vs. current comparison
- Growth chart (reading speed over time)
- Achievement badges
- Shareable progress card
- Subscription / billing panel (Stripe Premium — shipped ahead of the
  original long-term backlog slot)

Active-reading timers (visibility + in-page idle detection) also landed
around this work so WPM stats stop getting wrecked by tab switches or
long vocabulary-panel pauses. That isn't a separate feature ID, but it
matters for trusting the dashboard numbers.

---

## Landing Page Redesign — Cancelled

Early Phase 4 plans included a branded splash / marketing landing page.
Product decision: **no splash.** `/` sends signed-out users to sign-in and
signed-in users into assessment or the reader. Marketing can live outside
the app later if needed; it is not part of the in-product loop.

---

## Responsive Mobile Layout — Shipped

Core flows (reader, progress, games, community, auth) were hardened for
mobile use. Phase 4 treats mobile web as done for MVP purposes — not a
native App Store app (that's still long-term backlog).

---

## Related Work That Landed Around Phase 4

Not every ship during this window was invented by the original Phase 4
table, but they belong in the Phase 4 story:

| Work | Why it matters |
|------|----------------|
| Stripe Premium billing | Free-tier limits + upgrade/manage on Progress |
| Vocabulary Claude fallback | Free dictionary API misses technical terms / proper nouns |
| Clerk signup webhook | Phase 5 P0 item shipped early — User rows at signup, not only after baseline |
| Active reading + idle timers | Honest WPM / elapsed time for progress |

---

## What Phase 4 Explicitly Did *Not* Finish

Deferred or cancelled on purpose (not forgotten):

1. Community votes / ranking / moderation → Post-MVP backlog
2. Marketing landing / splash → Cancelled
3. Native mobile apps → still long-term
4. Multilingual (F-011 / F-011b) → still Phase 3 deferred work

---

## Exit Criteria — Met

From `ROADMAP.md`:

> Games available for practice; community platform MVP live; dashboard
> shows meaningful progress data.

All three are true in production. Phase 4 is **Complete** as of August 2026.

---

## The Big Picture

When you combine Phases 2–4, Brainiac supports:

1. Baseline assessment and guided chunk reading with AI-scored summaries
2. Full-session summary, quizzes, voice read/speak, photo OCR
3. Practice games (visual, memory, listening)
4. Community discussion (MVP)
5. A progress home with streaks, insights, badges, share, and billing
6. Mobile-usable web flows without a separate splash gate

Phase 5 is the beta-hardening phase: environment hardening, invite
controls, E2E coverage, performance, and remaining launch polish — with
Clerk user sync already shipped.
