# Brainiac — Phase 3 Explained in Plain English

This document explains what Phase 3 added, what shipped, what was tried and
deliberately rolled back, and what is still left before Phase 3 is fully
closed. It's written to be complete enough to answer questions about — every
claim here was checked against the actual commit history and code, not
written from memory.

---

## What Phase 3 Was About

Phase 2 made Brainiac usable. Phase 3 made it intelligent, interactive, and
production-grade.

The goal of Phase 3 was to add:

- AI feedback quality (not just save data, but evaluate it)
- Voice-based learning (listen + speak)
- Better end-of-session learning loops (summaries + quizzes)
- Real admin visibility into product usage
- Alternative content intake (photo OCR)
- Engineering process maturity (CI, automated tests, branch protection)

---

## F-003 Extension — AI Summary Scoring

In Phase 2, users wrote micro-summaries and we stored them.
In Phase 3, Claude began scoring those summaries.

Now, after a user submits a chunk summary, Brainiac can:

- Score it from 0 to 100
- Return short encouraging feedback
- Show that score before the user moves on

This turns "write a sentence" into an actual comprehension check.

---

## F-004 — Full Session Summary

After finishing a document, users can ask Brainiac for a full summary.

What it does:

- Calls Claude server-side
- Returns readable markdown output
- Shows the summary in a modal
- Saves/reuses summary data so the result is not lost

This gives users a "final synthesis" view after they complete reading.

---

## F-005 — Comprehension Quizzes

After completing a document, users can generate a quiz and test retention.

Flow:

- Claude generates multiple-choice questions from the document
- User answers inside quiz UI
- App scores results and shows explanation breakdown

This closes the loop from reading -> recall -> feedback.

---

## F-010 — Voice Reader (ElevenLabs)

Users can listen to section text with selectable voices.

What shipped:

- Voice list loading from ElevenLabs
- Generate speech audio for current chunk
- Play/pause, seek, speed controls
- Voice switching behavior fixes and safer playback state handling

This supports auditory learners and improves accessibility.

---

## F-012 — Voice Summarization

Users can speak their summary instead of typing it.

What shipped:

- Browser recording UI
- Server-side transcription pipeline
- Reuse of the same summary scoring flow
- Submission/loading behavior fixes for reliability

This lets users practice comprehension verbally, not just in text.

---

## F-018 — Image/Photo Upload (Claude Vision OCR)

Users can start a session from photos of pages.

What shipped:

- Upload one or more images
- Extract text with Claude Vision
- Let user review/edit extracted text
- Continue into the normal chunk reader flow

This removes the "must paste text manually" blocker.

---

## F-019 — Admin Analytics Dashboard

Phase 3 introduced an owner-only admin dashboard at `/admin`.

What it gives:

- Signup and onboarding visibility
- Session and engagement metrics
- AI usage and quiz metrics
- Vocabulary usage metrics

This gives product-level visibility without external analytics tools.

**One metric was fixed after shipping** — see "Bugs Found and Fixed" below.
The dashboard's numbers can now actually be trusted.

---

## Bugs Found and Fixed (Specifics, Not Generalities)

A dedicated bug-hunting pass went through the reader, admin, and progress
code. These are the real findings — worth knowing individually, because
they're the kind of thing a technical reviewer might specifically ask about.

**1. Word-click tokenizer broke on ordinary English text, not just edge
cases.** The regex that decides what counts as a "clickable word" for the
vocabulary mapper only recognized plain `a-z` letters and a straight
apostrophe. Any text copied from Microsoft Word, Google Docs, or most
published websites — which all default to curly/smart quotes (’ instead of the plain ') — broke contractions like “don’t” into three pieces: a clickable “don”, a dead unclickable apostrophe, and a clickable “t”. Loanwords like “naïve” or “café” had the same problem. This wasn't a rare edge case;
it was the default behavior of copy-pasted content. Fixed by widening the
character range to include accented Latin letters and curly apostrophes.

**2. Reading streaks used the server's UTC day instead of the reader's local
day.** The streak calculation determined "which day" a session happened on
using the server's UTC date. Demonstrated concretely: someone reading at
3:59pm and 4:01pm Pacific time — the same actual afternoon, two minutes apart
— got recorded as two different calendar days, purely because 4pm Pacific
crosses midnight UTC. This could silently break a real daily streak or
inflate a single day into two. Fixed by capturing each user's actual IANA
timezone (a small, one-time browser detection with no permission prompt) and
computing streak/chart dates in *that* timezone instead of UTC.

**3. The admin dashboard's "Assessment completion rate" could never show
anything but ~100%, no matter how many people actually dropped off.** There's
no Clerk-to-Postgres signup webhook — a `User` row only gets created in the
database once someone *finishes* onboarding. That meant "Total signups" and
"Baseline completed" were structurally almost the same number by
construction, so the completion-rate metric could never reveal real
drop-off. Fixed by pulling the true signup count directly from Clerk's own
API instead of the Postgres `User` table.

**4. The Socratic Tutor could desync if its first question failed to load.**
If the initial Claude call errored out (network hiccup, API error), the
input box stayed enabled even though no question had ever been shown.
Typing and sending got counted as "answer #1" to a question that never
existed, throwing off the 5-question counter. Fixed by gating input on an
actual question existing, with a proper retry button for that failure case.

**5. The vocabulary bank page had no pagination.** It loaded a user's entire
saved-word history in one unbounded query. Not broken yet, but would degrade
badly for anyone who reads for months and clicks a lot of words. Fixed with
a bounded, paged query.

All five were verified with reproduction (not just claimed) before being
fixed, and the fixes were re-verified against a fresh clone of the real repo
before being merged — not just checked in an isolated sandbox.

---

## Engineering Process Maturity Added

Alongside the bug hunt, Phase 3 closed out with real process infrastructure
that didn't exist before:

- **Automated test suite** — Vitest was introduced with coverage for the
  pure logic most worth protecting: reading streak calculation, WPM/growth
  stats, timezone conversion, and keyword extraction. The suite stood at
  **12 tests across 4 files** at the close of Phase 3 (it has grown
  significantly since, as Phase 4 features added their own coverage).
- **CI pipeline** (`.github/workflows/ci.yml`) — every push and pull request
  now automatically runs lint, the test suite, and a full production build.
  Before this, "does it actually work" depended entirely on someone
  remembering to check locally.
- **Branch protection on `main`** — CI is now a required check before a pull
  request can merge, verified by actually testing the flow end-to-end
  (pushing a real branch and PR through it), not just enabling the setting
  and assuming it worked.
- **Branding/metadata cleanup** — `package.json` and `package-lock.json`
  still carried the project's old working name (`readwise-app`) instead of
  `brainiac`. Fixed as a small piece of technical debt.

This matters for the same reason the bug hunt matters: it's the difference
between "it works on my machine" and a codebase that catches its own
mistakes automatically going forward.

---

## The Spanish Attempt (F-011 / F-011b) — Built, Then Deliberately Rolled Back

This is worth documenting carefully because **it left no trace in the git
history** — the work was built, tested, and then fully reverted before ever
being committed. Without this section, the honest answer to "did we try
Spanish support?" would be lost information.

**What was actually built, end to end:**

- A language-selection screen shown before the baseline assessment, with the
  choice saved immediately (so it stuck even if someone abandoned onboarding
  partway through).
- A genuine, hand-translated Spanish version of the baseline reading
  passage and all 12 assessment questions — not a runtime machine
  translation, and structurally identical (same correct answers, same
  question order) so scoring stayed fair and comparable across languages.
- Every AI feature (summary scoring, the Socratic tutor, the highlight
  tutor, quiz generation, full-session summaries) instructed to respond
  entirely in the user's chosen language.
- A language switcher in the nav so the choice was changeable later, not
  locked in forever.
- A real attempt to extend the vocabulary click-to-define feature to
  Spanish, which is where the effort ran into a genuine, external problem.

**Why it was rolled back — a real technical finding, not a change of
mind:** the free dictionary API the vocabulary mapper depends on
(`dictionaryapi.dev`) migrated its data source in 2021 and dropped
non-English language support at that time, with the maintainer only ever
promising to "eventually" bring it back. Live testing confirmed this
directly — a lookup for a very common Spanish word returned nothing at all.
Separately, the same click-to-define feature's word validation only
accepted plain `a-z` characters, meaning it rejected the vast majority of
real Spanish words before the API problem was even reached — the same
character-class bug as finding #1 above, but hit here first in the Spanish
work.

A fix was designed (routing non-English lookups through Claude instead of
the abandoned free API) and built, but at that point the combined
complexity and the friction of the whole effort led to a clear decision:
**stop, fully revert, and revisit later** rather than keep layering fixes
onto a feature under time pressure.

**The rollback itself was done properly, not just abandoned:** the
database migration that had already been applied (a new `language` column
on the vocabulary table) was manually reversed with real SQL, verified
against the live database, and Prisma's own migration history was cleaned
up so it wouldn't cause "drift detected" confusion on a future migration.
The final state was confirmed clean: build passing, `git status` clean,
zero leftover schema or code.

**Bottom line:** Spanish support is a known, scoped, partially-de-risked
piece of future work — not an unknown. The next attempt already knows to
route non-English dictionary lookups through Claude from the start, and
already has a real Spanish baseline-assessment translation ready to reuse.

---

## What Is Still Left in Phase 3

- **F-011** — multilingual support (language selection + translated
  onboarding/UI/TTS defaults)
- **F-011b** — Spanish-first milestone rollout

Both were attempted (see above) and deliberately deferred, not simply
unstarted. Everything else in the Phase 3 core scope is complete.

---

## The Big Picture

When you combine Phase 2 + shipped Phase 3, Brainiac now supports:

1. Baseline assessment and guided chunk reading
2. Micro-summary comprehension checks with AI scoring
3. Full-session AI summary and retention quiz
4. Voice reading and voice summarization
5. Photo-to-text intake via OCR
6. Progress tracking plus admin-level product analytics that can actually
   be trusted
7. An automated safety net (tests + CI + branch protection) that catches
   regressions before they reach production

That is a full active-reading platform with meaningful AI feedback loops,
built on a foundation that verifies itself.
