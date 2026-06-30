# Database Schema — Brainiac

**Version:** 1.0  
**Last updated:** June 2025  
**ORM:** Prisma  
**Database:** PostgreSQL (Supabase)

This document describes the data model for Brainiac. The canonical source is `prisma/schema.prisma` once implemented.

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ ReadingSession : owns
    User ||--o| BaselineAssessment : has
    ReadingSession ||--o| Summary : has
    ReadingSession ||--o{ Quiz : has
    Quiz ||--|{ Question : contains
    Quiz ||--o{ QuizAttempt : receives

    User {
        string id PK "Clerk userId"
        string email
        string name
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
```

---

## 2. Models

### 2.1 User

Mirrors Clerk user identity. Created on first sign-in or via Clerk webhook.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | PK | Clerk `userId` |
| `email` | `String` | Unique, optional | Primary email from Clerk |
| `name` | `String` | Optional | Display name |
| `preferredLanguage` | `String` | Default `"en"` | BCP-47 tag set on language selection screen (F-011) |
| `createdAt` | `DateTime` | Default now | First seen |
| `updatedAt` | `DateTime` | Auto | Last updated |

**Relations:** `readingSessions`, `quizAttempts`, `baselineAssessment`

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
| `createdAt` | `DateTime` | Default now | Created |
| `updatedAt` | `DateTime` | Auto | Updated |
| `completedAt` | `DateTime` | Optional | When quiz completed |

**Enum `SessionStatus`:** `DRAFT`, `ACTIVE`, `COMPLETED`, `ARCHIVED`

**Relations:** `user`, `summary`, `quizzes`

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

## 3. Prisma Schema (Reference)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum SessionStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum SummaryDepth {
  BRIEF
  STANDARD
  DETAILED
}

model User {
  id                 String              @id
  email              String?             @unique
  name               String?
  preferredLanguage  String              @default("en")
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  readingSessions    ReadingSession[]
  quizAttempts       QuizAttempt[]
  baselineAssessment BaselineAssessment?
}

model BaselineAssessment {
  id                 String   @id @default(cuid())
  userId             String   @unique
  readingSpeedWPM    Int
  comprehensionScore Float
  vocabularyScore    Float
  inferenceScore     Float
  overallScore       Float
  takenAt            DateTime
  createdAt          DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ReadingSession {
  id          String        @id @default(cuid())
  userId      String
  title       String
  sourceText  String        @db.Text
  wordCount   Int?
  sourceUrl   String?
  status      SessionStatus @default(DRAFT)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  completedAt DateTime?

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  summary  Summary?
  quizzes  Quiz[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, status])
}

model Summary {
  id               String       @id @default(cuid())
  sessionId        String       @unique
  depth            SummaryDepth
  content          String       @db.Text
  model            String
  promptTokens     Int?
  completionTokens Int?
  createdAt        DateTime     @default(now())

  session ReadingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model Quiz {
  id            String        @id @default(cuid())
  sessionId     String
  questionCount Int
  model         String
  createdAt     DateTime      @default(now())

  session   ReadingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  questions Question[]
  attempts  QuizAttempt[]

  @@index([sessionId])
}

model Question {
  id           String @id @default(cuid())
  quizId       String
  orderIndex   Int
  prompt       String @db.Text
  options      Json
  correctIndex Int
  explanation  String? @db.Text

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)

  @@index([quizId, orderIndex])
}

model QuizAttempt {
  id           String   @id @default(cuid())
  quizId       String
  userId       String
  answers      Json
  score        Float
  correctCount Int
  totalCount   Int
  createdAt    DateTime @default(now())

  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([quizId, userId])
}
```

---

## 4. Migration Strategy

1. **Initial migration** — Create all tables above
2. **User sync** — Clerk webhook creates/updates `User` on `user.created` / `user.updated`
3. **Production** — `npx prisma migrate deploy` in CI before or after Vercel deploy
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
| User deletes session | Cascade delete summary, quizzes, questions, attempts |
| User deletes account (Clerk) | Webhook triggers cascade delete of all user data |
| Session archived | Soft status change; excluded from default dashboard query |

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

| Feature | Proposed Model |
|---------|----------------|
| Baseline assessment | `BaselineAssessment` — planned Phase 2 (F-017) |
| Reading streaks | `Streak` or computed from `QuizAttempt.createdAt` |
| Tags / folders | `Tag`, `SessionTag` join table |
| Spaced repetition | `ReviewSchedule` linked to `Question` |
| Uploaded files | `FileAsset` with Supabase Storage URL |
| Annotations | `Highlight` on `ReadingSession` |
