# Features — Brainiac

**Version:** 1.0  
**Last updated:** July 2026

Detailed feature specifications for Brainiac. For product context see [PRD.md](./PRD.md); for implementation see [ARCHITECTURE.md](./ARCHITECTURE.md).

For plain-English narrative walkthroughs, see [PHASE2_EXPLAINED.md](./PHASE2_EXPLAINED.md) and [PHASE3_EXPLAINED.md](./PHASE3_EXPLAINED.md).

---

## Feature Index

| ID | Feature | Phase | Status |
|----|---------|-------|--------|
| F-001 | Authentication | 0 | ✅ Shipped |
| F-002 | Route Protection | 0 | ✅ Shipped |
| F-003 | Reading Sessions | 2 | ✅ Shipped |
| F-004 | AI Summaries | 3 | ✅ Shipped |
| F-005 | Comprehension Quizzes | 3 | ✅ Shipped |
| F-006 | Dashboard & Progress | 2 / 4 | 🚧 In Progress |
| F-007 | Onboarding Tour | 5 | 🔲 Planned |
| F-008 | Direct File Upload (.txt/.pdf) | Post-MVP | 🔲 Planned |
| F-009 | URL Import | Post-MVP | 🔲 Planned |
| F-010 | Voice Reader (ElevenLabs) | 3 | ✅ Shipped |
| F-011 | Multilingual Support (language selection + translated UI/assessment/TTS) | 3 | 🔲 Planned |
| F-012 | Voice Summarization | 3 | ✅ Shipped |
| F-013 | Visual Learning Games | 4 | ✅ Shipped |
| F-014 | Memory Games | 4 | ✅ Shipped |
| F-015 | Listening Games (Song Lyrics) | 4 | ✅ Shipped |
| F-016 | Community Platform | 4 | 🚧 In progress (MVP shipped) |
| F-017 | Onboarding Baseline Assessment | 2 | ✅ Shipped |
| F-018 | Image/Photo Upload (Claude Vision OCR) | 3 | ✅ Shipped |
| F-019 | Admin Analytics Dashboard | 3 | ✅ Shipped |
| F-011b | Spanish Language Support Milestone | 3 | 🔲 Planned |

**Legend:** ✅ Shipped · 🚧 In Progress · 🔲 Planned

---

## Phase 3 Remaining Build Order (Authoritative)

1. **F-011 — Multilingual Support** (language selection, translated onboarding/UI, multilingual TTS defaults)
2. **F-011b — Spanish Language Support** (language selection before onboarding + Spanish translated assessment/content)

---

## F-001: Authentication

**Phase:** 0 · **Status:** ✅ Shipped

### Description

Users sign up and sign in via Clerk with email/password or OAuth providers. Sessions persist across browser restarts.

### User Flow

1. Visitor lands on app → redirected to `/sign-in` if unauthenticated
2. User signs up at `/sign-up` or signs in at `/sign-in`
3. Clerk establishes session → user redirected to dashboard (future) or home

### Technical Details

- `ClerkProvider` wraps app in `app/layout.tsx`
- Sign-in/up pages use Clerk `<SignIn />` and `<SignUp />` components
- Clerk dashboard configures allowed OAuth providers

### Acceptance Criteria

- [x] Sign-up creates a Clerk user
- [x] Sign-in restores session on return visit
- [x] Sign-out clears session
- [ ] User record synced to database (Phase 1)

---

## F-002: Route Protection

**Phase:** 0 · **Status:** ✅ Shipped

### Description

All application routes require authentication except sign-in and sign-up pages.

### Technical Details

- Middleware in `proxy.ts` using `clerkMiddleware`
- Public routes: `/sign-in(.*)`, `/sign-up(.*)`
- `auth.protect()` on all other matched routes

### Acceptance Criteria

- [x] Unauthenticated access to `/` redirects to sign-in
- [x] `/sign-in` and `/sign-up` accessible without auth
- [x] Authenticated users pass through to protected routes

---

## F-003: Reading Sessions

**Phase:** 2 · **Status:** ✅ Shipped

### Description

Users create reading sessions by pasting text, assign a title, and manage a personal library of sessions.

### User Flow

1. User clicks "New Session" on dashboard
2. Enters title and pastes text (or uploads file — see F-008)
3. Word count displayed live
4. Saves → redirected to session detail page
5. Can edit title/text, delete session, or archive

### UI Components

- `SessionForm` — title input, textarea, word count, save button
- `SessionList` — card grid/list on dashboard
- `SessionDetail` — reader view with text, actions sidebar

### Validation

| Rule | Behavior |
|------|----------|
| Title required | Min 1 char, max 200 chars |
| Text required | Min 100 chars, max 50,000 chars |
| Word count | Computed server-side on save |

### API / Actions

```typescript
createSession({ title, sourceText, sourceUrl? })
updateSession(sessionId, { title?, sourceText? })
deleteSession(sessionId)
archiveSession(sessionId)
```

All actions verify `auth().userId` matches session owner.

### Acceptance Criteria

- [x] Create session with title and text
- [x] View session list on dashboard
- [x] Open session detail page
- [ ] Edit and delete own sessions
- [x] Cannot access another user's session (403)

---

## F-004: AI Summaries

**Phase:** 3 · **Status:** ✅ Shipped

### Description

Claude generates a readable summary of the session text at the user's chosen depth.

### User Flow

1. User opens session detail
2. Selects depth: Brief (~3 bullets), Standard (~1 page), Detailed (structured sections)
3. Clicks "Generate Summary"
4. Loading indicator while Claude processes
5. Summary rendered in formatted view
6. Option to regenerate (replaces cached summary)

### Summary Depths

| Depth | Target Length | Structure |
|-------|---------------|-----------|
| Brief | ~100 words | 3–5 bullet points |
| Standard | ~300 words | Intro + key points + conclusion |
| Detailed | ~600 words | Sections with headings, vocabulary list |

### Technical Details

- Server Action: `generateSummary(sessionId, depth)`
- Model: `claude-sonnet-4-20250514`
- Response stored in `Summary` table
- Idempotent: if summary exists and user doesn't force regenerate, return cached

### Error Handling

| Error | User Message |
|-------|--------------|
| Text too long | "Text exceeds limit. Please shorten to X words." |
| API timeout | "Summary generation timed out. Please try again." |
| Rate limit | "Too many requests. Please wait a moment." |

### Acceptance Criteria

- [x] Generate full-session summary after document completion
- [x] Summary persists in the database and can be regenerated
- [x] Loading and error states displayed
- [x] API key never exposed to client

---

## F-005: Comprehension Quizzes

**Phase:** 3 · **Status:** ✅ Shipped

### Description

Claude generates multiple-choice questions from the reading text. Users answer, submit, and receive a score with explanations.

### User Flow

1. User clicks "Generate Quiz" on session page
2. System creates 5–10 questions (default: 5)
3. User answers each question (single select)
4. User submits → server scores answers
5. Results page: score, per-question feedback, explanations
6. Option to retake quiz

### Question Format

```json
{
  "prompt": "What is the main argument of the passage?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 1,
  "explanation": "The passage emphasizes..."
}
```

### Scoring

```
score = (correctCount / totalCount) * 100
```

Stored as `QuizAttempt` with full answer map.

### UI Components

- `QuizGenerator` — trigger + loading
- `QuizQuestion` — radio group per question
- `QuizResults` — score badge, question breakdown, explanations

### Acceptance Criteria

- [x] Generate quiz with 5+ valid questions
- [ ] All options are plausible (manual QA on prompts)
- [x] Submit calculates correct score
- [x] Explanations shown for incorrect answers
- [ ] Retake creates new attempt; history preserved
- [ ] Session marked COMPLETED on first quiz attempt

---

## F-006: Dashboard & Progress

**Phase:** 2 / 4 · **Status:** 🚧 In Progress

### Description

Central hub showing session history, aggregate stats, and reading streak.

### Dashboard Sections

| Section | Content |
|---------|---------|
| **Stats row** | Total sessions, avg quiz score, current streak |
| **Recent sessions** | Last 10 sessions with title, date, score badge |
| **Quick action** | "New Session" button |
| **Empty state** | Illustration + CTA when no sessions |

### Stats Calculations

| Stat | Source |
|------|--------|
| Total sessions | Count of non-archived `ReadingSession` |
| Avg score | Mean of latest `QuizAttempt.score` per session (30 days) |
| Streak | Consecutive calendar days with ≥1 `QuizAttempt` or session create |

### Acceptance Criteria

- [ ] Dashboard loads with correct stats
- [ ] Recent sessions list with pagination or "view all"
- [ ] Empty state for new users
- [ ] Stats update after new quiz attempt

---

## F-007: Onboarding

**Phase:** 5 · **Status:** 🔲 Planned

### Description

First-time users see a brief guided tour explaining Brainiac's value and how to create their first session.

### Flow

1. Detect first login (no sessions exist + flag not set)
2. Show 3-step modal or inline tour:
   - "Paste your reading material"
   - "Get an AI summary"
   - "Test yourself with a quiz"
3. CTA: "Create your first session"
4. Mark onboarding complete in user metadata (Clerk `publicMetadata` or DB flag)

### Acceptance Criteria

- [ ] Tour shown once for new users
- [ ] Dismissable at any step
- [ ] Not shown again after completion
- [ ] Links to create session

---

## F-008: File Upload (Post-MVP)

**Phase:** Post-MVP · **Status:** 🔲 Planned

### Description

Upload `.txt` or `.pdf` files to create a reading session without manual paste.

### Supported Formats

| Format | Method |
|--------|--------|
| `.txt` | Direct read |
| `.pdf` | Server-side text extraction (pdf-parse or similar) |

### Limits

- Max file size: 5 MB
- Extracted text subject to same 50,000 char limit

---

## F-009: URL Import (Post-MVP)

**Phase:** Post-MVP · **Status:** 🔲 Planned

### Description

Paste a URL to fetch and extract article text for a new reading session.

### Flow

1. User enters URL
2. Server fetches page, extracts main content (Readability-style)
3. Previews extracted text
4. User confirms → creates session with `sourceUrl` set

### Constraints

- [ ] HTTPS URLs only
- Timeout: 10 seconds
- Fallback message if extraction fails

---

## F-010: Voice Reader (ElevenLabs)

**Phase:** 3 · **Status:** ✅ Shipped

### Description

Text-to-speech reader with celebrity-style voices powered by the ElevenLabs API. Users listen to session text read aloud with selectable voice profiles.

### User Flow

1. User opens a reading session
2. Selects a voice from available ElevenLabs voice profiles
3. Clicks play → audio streams or downloads for the current chunk or full text
4. Playback controls: play, pause, speed adjustment

### Technical Details

- ElevenLabs API integration (server-side only)
- Voice list cached; audio generated on demand per chunk
- `ELEVENLABS_API_KEY` env var required

### Acceptance Criteria

- [x] At least 3 voice options available
- [x] Audio plays for session text without errors
- [x] Playback speed adjustable (0.75× – 2×)
- [x] API key never exposed to client

---

## F-011: Multilingual Support

**Phase:** 3 · **Status:** 🔲 Planned

### Description

Full multilingual support from the very first screen. A language selection step is shown **before** the F-017 baseline assessment, making language the first choice a new user makes. The selected language is saved permanently to `User.preferredLanguage` and drives the assessment, all interface text, TTS voice, and optional document translation.

### Supported Languages at Launch

Spanish, French, Portuguese, Mandarin, Arabic, Hindi, and English. Additional languages added based on demand.

### User Flow

1. New user completes Clerk sign-up
2. **Language selection screen** — "What language would you like to use?" with a dropdown of supported languages
3. Selection saved to `User.preferredLanguage` (BCP-47 tag, e.g. `"es"`, `"fr"`)
4. Assessment passage and all 12 questions translated into selected language via Claude API before rendering
5. All app UI text (navigation, buttons, labels, prompts) rendered in selected language throughout the session
6. Voice reader (F-010 TTS) defaults to the user's selected language automatically
7. When uploading a document or photo, user can optionally have content translated into their preferred language before it enters the chunk reader

### Changing Language

- Available from account settings at any time
- Changing language does **not** re-run the baseline assessment; it only updates UI and future TTS/translation defaults

### Schema Change

`User.preferredLanguage String @default("en")` — BCP-47 tag. Set on language selection screen, updated via account settings.

### Technical Details

- Language selection screen: `app/onboarding/language/page.tsx`
- Server Action: `setPreferredLanguage(lang: string)` — validates against allowed list, writes to `User.preferredLanguage`
- Assessment translation: Server Action calls Claude with the selected language before rendering `AssessmentFlow`
- UI localisation: initially a simple string map per supported language; swap for `next-intl` if scope grows
- TTS language passed directly to ElevenLabs voice selection (F-010)
- Document translation: optional step in `createReadingSession` or `submitImageUpload` (F-018)

### Acceptance Criteria

- [ ] Language selection screen shown before baseline assessment for every new user
- [ ] At least 7 languages available at launch
- [ ] `User.preferredLanguage` saved and reflected immediately across the app
- [ ] Assessment passage and all questions rendered in selected language
- [ ] UI navigation and button labels rendered in selected language
- [ ] TTS defaults to selected language
- [ ] User can change language from account settings without losing any data
- [ ] Language validation server-side — arbitrary strings rejected

### F-011b: Spanish-First Milestone (Phase 3)

- [ ] Spanish is available as a first-class language option before onboarding assessment
- [ ] Assessment passage/questions and key onboarding UI are available in Spanish
- [ ] Spanish flow is verified end-to-end before broader multilingual rollout

---

## F-012: Voice Summarization

**Phase:** 3 · **Status:** ✅ Shipped

### Description

Users record their own spoken summary of a reading session. AI evaluates the recording for comprehension accuracy against the source text.

### User Flow

1. User finishes reading a session or chunk
2. Clicks "Record Summary" → browser captures audio
3. Speech-to-text transcription runs server-side
4. Claude compares transcription to source text and scores comprehension
5. Results shown with feedback on missed key points

### Acceptance Criteria

- [x] Audio recording works in browser (Web Audio API)
- [x] Transcription generated server-side
- [x] Comprehension score returned with specific feedback
- [ ] Recording stored optionally for progress history

---

## F-013: Visual Learning Games

**Phase:** 4 · **Status:** ✅ Shipped

### Description

Interactive visual comprehension exercises tied to session content — matching, sequencing, and diagram-labeling games generated from reading material.

### Acceptance Criteria

- [x] At least 2 game types available per session
- [x] Games generated from session text via Claude
- [x] Scores tracked and compared to baseline

---

## F-014: Memory Games

**Phase:** 4 · **Status:** ✅ Shipped

### Description

Retention-focused recall games using content from the user's reading sessions. Spaced repetition mechanics reinforce key concepts over time.

### Acceptance Criteria

- [x] Flashcard-style recall game from session vocabulary
- [x] Spaced repetition schedule based on performance
- [x] Progress visible on dashboard

---

## F-015: Listening Games (Song Lyrics)

**Phase:** 4 · **Status:** ✅ Shipped

### Description

AI breaks down song lyrics into comprehension exercises. Users listen to audio, fill in blanks, and answer questions about meaning and vocabulary.

### User Flow

1. User selects or pastes song lyrics
2. AI segments lyrics into chunks with vocabulary annotations
3. Listening exercise: fill-in-the-blank or comprehension questions
4. Score recorded and compared to baseline

### Acceptance Criteria

- [x] Lyrics broken into annotated chunks by Claude
- [x] Audio sync with lyric highlighting
- [x] Comprehension questions generated per segment

---

## F-016: Community Platform

**Phase:** 4 · **Status:** 🚧 In progress — MVP shipped (text posts + threaded comments + delete-own); votes, recommendations feed, and moderation still planned

### Description

Reddit-style community platform where users share reading recommendations, discuss sessions, post comprehension tips, and upvote helpful content.

### Core Features

- User posts and threaded comments
- Upvote / downvote on posts and comments
- Reading recommendation lists
- Moderation tools (report, hide)

### Acceptance Criteria

- [ ] Users can create posts and comment
- [ ] Voting updates scores in real time
- [ ] Content moderated; auth required for all actions

---

## F-017: Onboarding Baseline Assessment

**Phase:** 2 · **Status:** ✅ Shipped

### Description

Every new user takes a 5-minute baseline assessment on first signup before accessing the chunk reader. Establishes a permanent benchmark for measuring all future progress.

> **Build order:** This feature ships **first** in Phase 2, before the core reader UI and chunk reader.

### Assessment Components

| Test | Measures | Duration |
|------|----------|----------|
| Timed reading passage | Reading speed (WPM) | ~2 min |
| Comprehension quiz | Understanding of passage | ~1 min |
| Vocabulary questions | Word knowledge level | ~1 min |
| Inference questions | Reading between the lines | ~1 min |

### User Flow

1. User completes Clerk sign-up
2. Redirected to `/onboarding/assessment` (cannot skip on first login)
3. Completes four test sections in sequence (~5 minutes total)
4. Scores calculated and saved to `BaselineAssessment` table
5. Results screen shows baseline profile
6. Redirected to dashboard / chunk reader

### Scoring

| Field | Range | Source |
|-------|-------|--------|
| `readingSpeedWPM` | Integer | Timed passage word count ÷ time |
| `comprehensionScore` | 0–100 | Comprehension quiz percentage |
| `vocabularyScore` | 0–100 | Vocabulary questions percentage |
| `inferenceScore` | 0–100 | Inference questions percentage |
| `overallScore` | 0–100 | Weighted composite of above |

Stored permanently in `BaselineAssessment` — one record per user, never overwritten.

### Progress Tracking

- All future reading sessions measured against baseline scores
- Dashboard shows delta vs. baseline (e.g. "+12 WPM", "+8 comprehension")
- Monthly progress report emails or in-app notification showing growth since baseline

### Technical Details

- Route: `app/onboarding/assessment/page.tsx`
- Server Action: `submitBaselineAssessment(scores)`
- Prisma model: `BaselineAssessment` (see `docs/SCHEMA.md`)
- Clerk `publicMetadata.onboardingComplete` flag set after submission

### Acceptance Criteria

- [x] Assessment shown automatically on first login
- [x] Cannot access reader until assessment complete
- [x] All four score dimensions saved to `BaselineAssessment`
- [x] Baseline displayed on dashboard
- [x] Future session scores compared to baseline
- [ ] Monthly progress report shows growth vs. baseline

---

## F-018: Image/Photo Upload

**Phase:** 3 · **Status:** ✅ Shipped

### Description

Users upload a photo of a book page, printed article, or other readable image. The Claude Vision API extracts the text, which then flows into the standard chunk reader — same progressive unlock, micro-summaries, and vocabulary tools as pasted text.

Works for textbooks, articles, handwritten notes, and any readable image where OCR-quality extraction is feasible.

### User Flow

1. User clicks "New document" and selects **Upload photo**
2. Chooses an image from device (JPEG, PNG, WebP; max size TBD)
3. Server sends image to Claude Vision API for text extraction
4. Extracted text previewed for user confirmation/editing
5. User saves → session created → standard chunk reader flow begins

### Technical Details

- Server Action or Route Handler using Anthropic Claude Vision (same API key as F-004/F-005)
- Model: Claude with vision support (e.g. `claude-sonnet-4-20250514`)
- Extracted text stored in `ReadingSession.sourceText` like any other session
- Image not persisted after extraction (optional future: Supabase Storage)
- Handwriting quality varies — show confidence warning when extraction is partial

### Acceptance Criteria

- [x] Upload JPEG/PNG image and receive extracted text
- [x] Extracted text editable before session save
- [x] Session flows into chunk reader identically to pasted text
- [x] Claude API key never exposed to client
- [x] Graceful error when image is unreadable or too blurry

---

## F-019: Admin Analytics Dashboard

**Phase:** 3 · **Status:** ✅ Shipped

### Description

A private page at `/admin` visible only to the app owner. Provides real engagement data from existing Prisma tables — no external analytics tools needed — so the owner can make data-driven decisions about readiness for wider user testing rather than guessing.

**Must be built before inviting outside beta testers.**

### Access Control

- Route is gated server-side by checking `auth().userId` against a hardcoded `ADMIN_USER_ID` env var
- Returns `notFound()` for any other authenticated user
- Not listed in navigation; not a public route

### Metrics Displayed

| Metric | Source table | Query |
|--------|-------------|-------|
| Total signups | `User` | `prisma.user.count()` |
| Assessment completion rate | `User`, `BaselineAssessment` | `baselineCount / userCount * 100` |
| Total reading sessions completed | `ReadingSession` | `count where status = COMPLETED` |
| Active users this week | `ReadingSession` or `QuizAttempt` | distinct `userId` with activity in last 7 days |
| Average reading streak | `ReadingSession` | median consecutive active days across all users |

### User Flow

1. Owner navigates to `/admin` while signed in
2. Page verifies `userId === ADMIN_USER_ID`; any mismatch returns 404
3. Stats rendered as a simple server-side dashboard (no client JS needed)
4. Owner uses data to decide when to open beta invites

### Technical Details

- Route: `app/admin/page.tsx` — pure Server Component
- Auth check: `const { userId } = await auth(); if (userId !== process.env.ADMIN_USER_ID) notFound();`
- All queries use existing Prisma models — no schema changes required
- `ADMIN_USER_ID` added to `.env.local` and Vercel env vars (not committed)
- No new dependencies needed

### Acceptance Criteria

- [x] Route returns 404 for any non-owner user
- [x] Route returns 404 for unauthenticated requests
- [x] All five metrics visible and accurate against live Supabase data
- [x] Page loads in under 3 seconds
- [x] `ADMIN_USER_ID` is an env var, never hardcoded in source

---

## Cross-Cutting Concerns

### Accessibility

- All form inputs have labels
- Quiz options keyboard-navigable
- Color contrast meets WCAG AA
- Loading states announced to screen readers

### Performance

- Dashboard session list: paginated (20 per page)
- AI calls: show skeleton/spinner; no blocking page render
- Optimistic UI for session title edits only (not AI generation)

### Security

- Every Server Action validates `auth().userId`
- Session/quiz IDs validated against ownership before any operation
- No user content in URL query params (POST/Server Actions only)

---

## Feature Request Template

When proposing a new feature, include:

1. **Problem** — What user pain does this solve?
2. **Proposal** — What should the feature do?
3. **User flow** — Step-by-step interaction
4. **Priority** — P0 / P1 / P2 and suggested phase
5. **Acceptance criteria** — Testable checklist

File issues on GitHub with the `feature` label.
