# Brainiac — Phase 2 Explained in Plain English

This document explains every feature Phase 2 built, what it actually does,
and why it matters for the user. Every specific claim below — button
labels, exact field names, chunk sizes — was checked directly against the
real code, not written from memory or copied from a spec.

---

## A Documentation Note Worth Knowing Before Anything Else

While verifying this document, a real inconsistency turned up between
three sources that are supposed to agree with each other:

1. **`docs/FEATURES.md`** assigns `F-001` to Authentication, `F-002` to
   Route Protection, `F-004` to AI Summaries, and `F-005` to Comprehension
   Quizzes — all Phase 0/3 items, not the Phase 2 reading experience.
2. **Code comments in the actual reading-experience files** use a
   *different* numbering — `lib/reading-sessions/chunking.ts` labels itself
   `(F-002)` for the chunk reader, for example.
3. **The previous version of this document** used yet a third, informal
   labeling ("F-001 Core Reader UI", "F-002 Chunk Reader", "F-004
   Vocabulary Mapper") that matched neither of the above.

On top of the numbering mismatch, several of `FEATURES.md`'s written specs
for these IDs describe a **simpler, different design than what was
actually built** — e.g. `F-003`'s spec describes a single flat
`SessionDetail` page with no chunking, and `F-004`'s spec describes a
user-selectable "Brief / Standard / Detailed" summary depth that doesn't
exist anywhere in the real code. `FEATURES.md` appears to be a planning
document that was written early and never fully reconciled with what
shipped.

**What this means practically:** the sections below are titled by what the
feature *does*, not by a contested number, and every mechanical detail is
verified against the actual code rather than against `FEATURES.md`'s prose.
If someone asks "what's F-002," the honest answer is "it depends which
document you ask" — worth knowing that going in, and worth a dedicated
`FEATURES.md` cleanup pass at some point so the project has one
source of truth instead of three.

---

## F-017 — Onboarding Baseline Assessment

The first thing a brand new user does. Before they can use Brainiac at all,
they take a roughly 5-minute test that measures four things:

- **Reading speed** — a passage appears, they click through when done, and
  the app records words-per-minute from elapsed time.
- **Comprehension** — multiple-choice questions about what they just read.
- **Vocabulary** — do they know what specific words from the passage mean?
- **Inference** — questions where the answer isn't stated directly; they
  have to reason about it.

All four scores save permanently to the database as a `BaselineAssessment`
row — one per user, never overwritten. This is what lets Brainiac later
show "you started at 42 WPM, you're now at 78."

---

## The Reading Experience: Reader Shell, Chunk Reader, and Micro-Summarization

`FEATURES.md` doesn't have a clean, single dedicated entry for this — see
the documentation note above — but it's the core of what Phase 2 built, so
here's what it actually does, verified against the real components.

**The shell.** A nav header, a sidebar listing the user's documents, and a
main reading area. Standard app-shell layout; no content logic of its own.

**The chunk reader.** Instead of showing a full document at once, the text
is split into paragraph-blank-line-separated chunks — **exactly 3
paragraphs per chunk** by default (the code's own comment describes this as
"the middle of a 3–4 paragraph target," but the actual number used is
always 3, not a range). Chunks are computed from the source text every time
the page loads rather than stored — so changing the chunk size later
wouldn't need a database migration.

The reader shows **"Section X of Y"** at the top (not "Chunk X of Y" — that
was this document's own earlier mistake). Only the current section is
visible; a timer runs while the user reads it; clicking **"Submit &
continue"** (not "Mark as read" — same correction) advances to the next
section.

**Micro-summarization.** Before advancing, the user has to do one of two
things (a third, voice recording, was added later in Phase 3 — it isn't a
Phase 2 feature, even though it lives in the same component today):

- **Write a summary** — a free-text sentence or two about what they just
  read.
- **Pick keywords** — select exactly 3 words from the section that best
  capture it.

Either way, the response is saved with a timestamp and which chunk it
belongs to. In Phase 2, nothing scored it yet — Claude-based scoring is a
Phase 3 addition (see `docs/PHASE3_EXPLAINED.md`). The mechanic itself —
forcing active engagement before moving on, instead of allowing passive
scrolling — is the actual comprehension-building idea, independent of
whether AI grades it.

---

## Vocabulary Mapper

While reading any section, the user can click a word to open a panel with:

- A definition
- Part of speech and phonetic pronunciation, when available
- Etymology/word origin, when available — many words simply don't have one
  in the free dictionary source this uses, and the panel says so honestly
  rather than making something up
- Up to 8 synonyms, when the source has that many — not a fixed count

(Two corrections from the previous version of this document: there's no
"example sentence using the word" field anywhere in the actual code, and
synonyms aren't a fixed "3" — it's whatever the dictionary source actually
returns, capped at 8.)

Every successfully looked-up word is saved to the user's personal
vocabulary bank automatically, reviewable from its own page.

---

## Progress Dashboard

A page showing the user how much they've improved since their baseline.
What Phase 2 established here: baseline scores vs. current scores, a
chart of reading speed over time, total sessions completed, total
vocabulary words saved, and current reading streak.

(Worth knowing: the chart itself has been rebuilt since Phase 2 — Phase 4
replaced a simple line chart with an interactive stock-ticker-style
component. The underlying idea — visualize WPM over time against baseline
— is the Phase 2 contribution; the specific chart implementation is
newer.)

---

## The Big Picture

When Phase 2 was complete, Brainiac became a real product with a real user
experience. Someone could:

1. Sign up
2. Take their baseline assessment
3. Create a reading session by pasting text
4. Read it in sections, progressively unlocked
5. Write a summary or pick keywords after each section
6. Save vocabulary words by clicking them
7. See their progress on a dashboard

That's a fully usable product without any AI yet. That's what got the first
real users.

Phase 3 is when Claude came in and made everything intelligent. Phase 2 is
what made it real.

---

## Why This Order Mattered

Each feature built on the one before it:

- No chunk reader without the reader shell
- No micro-summarization without the chunk reader
- No vocabulary mapper without something to read
- No progress dashboard without data from all of the above

This is why the build happened in sequence rather than skipping steps.
