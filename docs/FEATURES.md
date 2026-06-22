# Features — Brainiac

**Version:** 1.0  
**Last updated:** June 2025

Detailed feature specifications for Brainiac. For product context see [PRD.md](./PRD.md); for implementation see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Feature Index

| ID | Feature | Phase | Status |
|----|---------|-------|--------|
| F-001 | Authentication | 0 | ✅ Shipped |
| F-002 | Route Protection | 0 | ✅ Shipped |
| F-003 | Reading Sessions | 1 | 🔲 Planned |
| F-004 | AI Summaries | 2 | 🔲 Planned |
| F-005 | Comprehension Quizzes | 3 | 🔲 Planned |
| F-006 | Dashboard & Progress | 4 | 🔲 Planned |
| F-007 | Onboarding | 5 | 🔲 Planned |
| F-008 | File Upload | Post-MVP | 🔲 Planned |
| F-009 | URL Import | Post-MVP | 🔲 Planned |

**Legend:** ✅ Shipped · 🚧 In Progress · 🔲 Planned

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

**Phase:** 1 · **Status:** 🔲 Planned

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

- [ ] Create session with title and text
- [ ] View session list on dashboard
- [ ] Open session detail page
- [ ] Edit and delete own sessions
- [ ] Cannot access another user's session (403)

---

## F-004: AI Summaries

**Phase:** 2 · **Status:** 🔲 Planned

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

- [ ] Generate summary at each depth level
- [ ] Summary persists and loads on return visit
- [ ] Regenerate replaces previous summary
- [ ] Loading and error states displayed
- [ ] API key never exposed to client

---

## F-005: Comprehension Quizzes

**Phase:** 3 · **Status:** 🔲 Planned

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

- [ ] Generate quiz with 5+ valid questions
- [ ] All options are plausible (manual QA on prompts)
- [ ] Submit calculates correct score
- [ ] Explanations shown for incorrect answers
- [ ] Retake creates new attempt; history preserved
- [ ] Session marked COMPLETED on first quiz attempt

---

## F-006: Dashboard & Progress

**Phase:** 4 · **Status:** 🔲 Planned

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

- HTTPS URLs only
- Timeout: 10 seconds
- Fallback message if extraction fails

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
