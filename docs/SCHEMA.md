# Database Schema — Brainiac

**Version:** 1.1  
**Last updated:** August 2026  
**ORM:** Prisma  
**Database:** PostgreSQL (Supabase)

This document summarizes the data model for Brainiac. The canonical source is always [`prisma/schema.prisma`](../prisma/schema.prisma).

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ ReadingSession : owns
    User ||--o| BaselineAssessment : has
    User ||--o| Subscription : has
    User ||--o{ VocabularyWord : looks_up
    User ||--o{ VocabularyReview : reviews
    User ||--o{ QuizAttempt : submits
    User ||--o{ VisualGameAttempt : plays
    User ||--o{ ListeningGame : creates
    User ||--o{ ListeningAttempt : plays
    User ||--o{ Badge : earns
    User ||--o{ CommunityPost : authors
    User ||--o{ CommunityComment : writes
    User ||--o{ Feedback : submits
    User ||--o{ HighlightInteraction : highlights
    ReadingSession ||--o| Summary : has
    ReadingSession ||--o{ Quiz : has
    ReadingSession ||--o{ ChunkSummary : has
    ReadingSession ||--o{ TutorMessage : has
    ReadingSession ||--o{ VisualGame : has
    ReadingSession ||--o{ VocabularyWord : sources
    ReadingSession ||--o{ HighlightInteraction : has
    Quiz ||--|{ Question : contains
    Quiz ||--o{ QuizAttempt : receives
    VocabularyWord ||--o| VocabularyReview : schedules
    VisualGame ||--|{ VisualGameItem : contains
    VisualGame ||--o{ VisualGameAttempt : receives
    ListeningGame ||--|{ ListeningSegment : contains
    ListeningGame ||--o{ ListeningAttempt : receives
    CommunityPost ||--o{ CommunityComment : has

    User {
        string id PK "Clerk userId"
        string email
        string name
        string preferredLanguage
        string timezone
        datetime createdAt
        datetime updatedAt
    }

    BaselineAssessment {
        string id PK
        string userId FK
        int readingSpeedWPM
        float comprehensionScore
        float vocabularyScore
        float inferenceScore
        float overallScore
        datetime takenAt
        datetime createdAt
    }

    ReadingSession {
        string id PK
        string userId FK
        string title
        text sourceText
        int wordCount
        string sourceUrl
        enum status
        int currentChunkIndex
        int elapsedSeconds
        datetime createdAt
        datetime updatedAt
        datetime completedAt
    }

    Summary {
        string id PK
        string sessionId FK
        enum depth
        text content
        string model
        int promptTokens
        int completionTokens
        datetime createdAt
    }

    Quiz {
        string id PK
        string sessionId FK
        int questionCount
        string model
        datetime createdAt
    }

    Question {
        string id PK
        string quizId FK
        int orderIndex
        text prompt
        json options
        int correctIndex
        text explanation
    }

    QuizAttempt {
        string id PK
        string quizId FK
        string userId FK
        json answers
        float score
        int correctCount
        int totalCount
        datetime createdAt
    }

    Invite {
        string id PK
        string email UK
        enum status
        datetime createdAt
        datetime acceptedAt
    }
```

---

## 2. Models

### 2.1 User

Mirrors Clerk user identity. Created via Clerk webhook on `user.created` / `user.updated` (and ensured on first authenticated flow if needed).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK | Clerk `userId` |
| `email` | `String` | Unique, optional | Primary email from Clerk |
| `name` | `String` | Optional | Display name |
| `preferredLanguage` | `String` | Default `"en"` | BCP-47 tag set on language selection screen (F-011) |
| `timezone` | `String` | Optional | IANA zone from client `TimezoneSync` — streak / progress calendar days |
| `createdAt` | `DateTime` | Default now | First seen |
| `updatedAt` | `DateTime` | Auto | Last updated |

**Relations:** `readingSessions`, `quizAttempts`, `baselineAssessment`, `vocabularyWords`, `vocabularyReviews`, `highlightInteractions`, `visualGameAttempts`, `listeningGames`, `listeningAttempts`, `badges`, `communityPosts`, `communityComments`, `subscription`, `feedback`

---

### 2.2 BaselineAssessment

Permanent baseline scores captured during onboarding (F-017). One record per user; all future progress is measured against this baseline.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, cuid | Assessment ID |
| `userId` | `String` | FK → User, Unique | Clerk `userId` |
| `readingSpeedWPM` | `Int` | Required | Words per minute from timed reading |
| `comprehensionScore` | `Float` | Required | 0–100 comprehension quiz score |
| `vocabularyScore` | `Float` | Required | 0–100 vocabulary level score |
| `inferenceScore` | `Float` | Required | 0–100 inference question score |
| `overallScore` | `Float` | Required | 0–100 composite baseline score |
| `takenAt` | `DateTime` | Required | When the assessment was completed |
| `createdAt` | `DateTime` | Default now | Record created |

**Indexes:**
- `(userId)` — unique lookup per user

---

### 2.3 ReadingSession

Core entity representing one reading unit.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, cuid | Session ID |
| `userId` | `String` | FK → User | Owner |
| `title` | `String` | Required | User-defined title |
| `sourceText` | `Text` | Required | Raw reading content |
| `wordCount` | `Int` | Optional | Computed on save |
| `sourceUrl` | `String` | Optional | Original URL if imported |
| `status` | `SessionStatus` | Default `DRAFT` | Lifecycle state |
| `currentChunkIndex` | `Int` | Default `0` | Next unread chunk (F-002); chunks derived at render time |
| `elapsedSeconds` | `Int` | Default `0` | Accrued active reading time (F-005), client-reported / server-clamped |
| `createdAt` | `DateTime` | Default now | Created |
| `updatedAt` | `DateTime` | Auto | Updated |
| `completedAt` | `DateTime` | Optional | When session completed |

**Enum `SessionStatus`:** `DRAFT`, `ACTIVE`, `COMPLETED`, `ARCHIVED`

**Relations:** `user`, `summary`, `quizzes`, `chunkSummaries`, `vocabularyWords`, `highlightInteractions`, `tutorMessages`, `visualGames`

**Indexes:**
- `(userId, createdAt DESC)` — dashboard listing
- `(userId, status)` — filtered views

---

### 2.4 Summary

AI-generated summary for a session. One active summary per session (regenerate replaces).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, cuid | Summary ID |
| `sessionId` | `String` | FK → ReadingSession, Unique | Parent session |
| `depth` | `SummaryDepth` | Required | Brief / standard / detailed |
| `content` | `Text` | Required | Generated summary body |
| `model` | `String` | Required | Claude model ID used |
| `promptTokens` | `Int` | Optional | Usage tracking |
| `completionTokens` | `Int` | Optional | Usage tracking |
| `createdAt` | `DateTime` | Default now | Generated at |

**Enum `SummaryDepth`:** `BRIEF`, `STANDARD`, `DETAILED`

---

### 2.5 Quiz

A generated quiz attached to a session. Multiple quizzes per session allowed (regeneration).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, cuid | Quiz ID |
| `sessionId` | `String` | FK → ReadingSession | Parent session |
| `questionCount` | `Int` | Required | Number of questions |
| `model` | `String` | Required | Claude model ID |
| `createdAt` | `DateTime` | Default now | Generated at |

**Relations:** `session`, `questions`, `attempts`

---

### 2.6 Question

Individual multiple-choice question within a quiz.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, cuid | Question ID |
| `quizId` | `String` | FK → Quiz | Parent quiz |
| `orderIndex` | `Int` | Required | Display order (0-based) |
| `prompt` | `Text` | Required | Question text |
| `options` | `Json` | Required | Array of 4 option strings |
| `correctIndex` | `Int` | Required | 0–3 index of correct option |
| `explanation` | `Text` | Optional | Shown after submission |

**Indexes:** `(quizId, orderIndex)`

---

### 2.7 QuizAttempt

Records one user submission for a quiz.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK, cuid | Attempt ID |
| `quizId` | `String` | FK → Quiz | Quiz taken |
| `userId` | `String` | FK → User | Submitter |
| `answers` | `Json` | Required | Map of questionId → selectedIndex |
| `score` | `Float` | Required | Percentage 0–100 |
| `correctCount` | `Int` | Required | Number correct |
| `totalCount` | `Int` | Required | Total questions |
| `createdAt` | `DateTime` | Default now | Submitted at |

**Indexes:**
- `(userId, createdAt DESC)` — progress history
- `(quizId, userId)` — retake lookup

---

### 2.8 ChunkSummary / VocabularyWord / HighlightInteraction / TutorMessage

Shipped reading-session satellites (see `prisma/schema.prisma` for full columns):

- **ChunkSummary** — per-chunk micro-summary or keywords (F-003); advances `currentChunkIndex`; optional `aiScore` / `aiFeedback`
- **VocabularyWord** — dictionary lookup cache, unique per `(userId, word)` (F-004)
- **HighlightInteraction** — fire-and-forget log of Highlight Tutor invocations (F-019)
- **TutorMessage** — Socratic tutor turns (`USER` / `TUTOR`) for analytics / personalization

---

### 2.9 Subscription / Badge

- **Subscription** — Stripe state for Premium (`NONE` → `ACTIVE` / `TRIALING` / …); synced via `/api/stripe/webhook`
- **Badge** — permanently earned achievements (F-021); `key` from `lib/badges/definitions.ts`, unique per `(userId, key)`

---

## 3. Prisma Schema (Reference)

Do not duplicate the full schema here — it drifts. Open [`prisma/schema.prisma`](../prisma/schema.prisma) for enums, indexes, and every model. After schema changes, run `npx prisma migrate dev` and keep this doc’s ERD / section summaries in sync.

---

## 4. Migration Strategy

1. **Migrations** — Live under `prisma/migrations/`; apply with Prisma CLI
2. **User sync** — Clerk webhook creates/updates `User` on `user.created` / `user.updated` (also enforces beta invites)
3. **Production** — `npx prisma migrate deploy` against the production DB (before or after Vercel deploy)
4. **Local dev** — `npx prisma migrate dev`

### Supabase Connection URLs

```env
# Pooled connection (Vercel serverless)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (migrations)
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

---

## 5. Data Retention & Deletion

| Event | Behavior |
|-------|----------|
| User deletes session | Cascade delete summary, quizzes, questions, attempts, chunk summaries, tutor messages, visual games, related highlights |
| User deletes account (Clerk) | Cascade delete of all user-owned rows via Prisma `onDelete: Cascade` |
| Session archived | Soft status change; excluded from default dashboard query |
| Pending invite revoked | Row deleted (not soft-`REVOKED`) — see §11 |

---

## 6. Query Patterns

### Dashboard — recent sessions

```typescript
prisma.readingSession.findMany({
  where: { userId, status: { not: "ARCHIVED" } },
  orderBy: { createdAt: "desc" },
  take: 20,
  include: {
    summary: { select: { id: true } },
    quizzes: {
      take: 1,
      orderBy: { createdAt: "desc" },
      include: {
        attempts: {
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    },
  },
});
```

### Average quiz score (last 30 days)

```typescript
prisma.quizAttempt.aggregate({
  where: {
    userId,
    createdAt: { gte: thirtyDaysAgo },
  },
  _avg: { score: true },
  _count: true,
});
```

---

## 7. Future Schema Extensions

Shipped items (baseline, vocabulary SRS, highlight tutor log, Stripe subscription, badges, feedback, invites) live in §§2 / 8–11 — not listed here.

| Feature | Proposed Model |
|---------|----------------|
| Reading streaks | Still computed from session / quiz activity + `User.timezone` (no `Streak` table yet) |
| Tags / folders | `Tag`, `SessionTag` join table |
| Uploaded files | `FileAsset` with Supabase Storage URL |
| Feedback triage | Optional `status` / assignee columns on `Feedback` if volume grows |
| Soft-delete comments | `deletedAt` on `CommunityComment` if mid-thread deletes must preserve replies |

---

## 8. Games Models (Phase 4)

### VocabularyReview (F-014)

One row per vocabulary word the user has reviewed in the memory game. Leitner-ladder spaced repetition: `intervalDays` and `correctStreak` climb on correct answers (1 → 2 → 4 → 7 → 14 → 30 → 60 days); a miss resets to due-immediately. `vocabularyWordId` is unique — the row is upserted per word.

### VisualGame / VisualGameItem / VisualGameAttempt (F-013)

A `VisualGame` (MATCHING or SEQUENCING, via the `VisualGameType` enum) belongs to a `ReadingSession` and is generated from its `sourceText`. Each `VisualGameItem` stores client-safe display data in `itemData` (terms + shuffled descriptions, or shuffled steps) and the solution in `correctAnswer` as `{ selections: number[] }` — **server-only**: the generate route never returns it, and grading happens in the `submitVisualGameAttempt` server action. `VisualGameAttempt` records each graded play-through (`score` is a 0–1 fraction).

### ListeningGame / ListeningSegment / ListeningAttempt (F-015)

A `ListeningGame` belongs to a user and is built from lyrics the user pasted (no lyric search or licensing integration by design). Each `ListeningSegment` stores the segment's `lyricText`, `vocabularyAnnotations` (Json array of `{word, note}`), `blankedText` (with `____` markers), and `questions` — a Json answer key `{ blankAnswers, question: { prompt, options, correctIndex } }` that is stripped from API responses and used only by the `submitListeningAttempt` server action for grading. `ListeningAttempt` records each graded play-through.

## 9. Community Models (F-016 MVP)

### CommunityPost

Plain-text post (`title`, `body`) authored by a signed-in user. Deleting a post cascades to its comments. Indexed newest-first for the feed.

### CommunityComment

Threaded comment on a post. `parentId` (nullable) points at the parent comment; null means top-level. **MVP tradeoff:** `parentId` uses `onDelete: Cascade`, so deleting a comment deletes its whole reply subtree — chosen over soft-delete placeholders for simplicity; swap to a soft-delete `deletedAt` if threads later need to survive mid-node deletes. All mutations verify ownership server-side (`createPost` / `createComment` / `deleteOwnPost` / `deleteOwnComment` in `app/community/actions.ts`); replies are validated to belong to the same post as their parent.

## 10. Feedback (Phase 5)

### Feedback

Free-text beta feedback from the floating reader widget (`app/reader/FeedbackWidget.tsx`). Fields: `userId`, `message` (Text), optional `page` (pathname when submitted), `createdAt`. No status/triage columns yet — admin reads the raw list at `/admin/feedback`. Submissions are rate-limited via the Upstash `feedback` tier (10/hour).

## 11. Beta invites (Phase 5)

### Invite

Allowlist email for invite-only signup. `email` is unique and stored lowercased. Statuses in use: `PENDING` → `ACCEPTED` on Clerk `user.created` when the email matches. Revoking a pending invite **deletes** the row (`revokeInvite`); the `InviteStatus.REVOKED` enum value exists in Prisma but is unused. No FK to `User` — the invite exists before any account. Enforced in `app/api/clerk/webhook/route.ts` (ban uninvited Clerk users).
