# Product Requirements Document — Brainiac

**Version:** 1.0  
**Last updated:** June 2025  
**Status:** Draft — MVP in development

---

## 1. Executive Summary

Brainiac is an AI-powered reading comprehension platform that helps students, professionals, and lifelong learners understand and retain what they read. Users submit text (paste, upload, or URL), receive AI-generated summaries and comprehension quizzes powered by Anthropic Claude, and track their progress over time.

The product differentiates through **active comprehension** — not just summarization, but measurable understanding via quizzes, spaced review, and progress analytics.

---

## 2. Problem Statement

Readers often consume large volumes of text (articles, papers, textbooks) but struggle to:

- Retain key concepts after finishing
- Self-assess whether they truly understood the material
- Build consistent reading habits with measurable outcomes
- Get immediate, personalized feedback without a tutor

Existing tools offer highlights or passive summaries but rarely close the loop with assessment and progress tracking.

---

## 3. Goals & Success Metrics

### Primary Goals

| Goal | Description |
|------|-------------|
| **Comprehension** | Users demonstrate understanding via quiz scores ≥ 70% on average |
| **Retention** | Users return within 7 days to review or start new sessions |
| **Engagement** | Average session duration ≥ 5 minutes |
| **Reliability** | AI summary/quiz generation succeeds ≥ 99% of requests |

### Key Metrics (MVP)

- Daily / weekly active users (DAU / WAU)
- Sessions created per user per week
- Average quiz score per session
- Summary generation latency (p95 < 10s)
- Sign-up → first completed session conversion rate

---

## 4. Target Users

### Primary Personas

**Alex — College Student**  
Reads 3–5 academic articles per week. Needs quick summaries and self-testing before exams. Mobile-friendly, short sessions.

**Jordan — Knowledge Worker**  
Reads industry reports and long-form content. Wants to extract actionable insights and verify understanding without re-reading.

**Sam — Lifelong Learner**  
Reads books and essays for personal growth. Values streaks, history, and seeing improvement over time.

---

## 5. User Stories

### Authentication & Onboarding

| ID | Story | Priority |
|----|-------|----------|
| AUTH-1 | As a visitor, I can sign up with email or OAuth so I can save my reading sessions | P0 |
| AUTH-2 | As a user, I am redirected to sign-in when accessing protected routes | P0 |
| AUTH-3 | As a new user, I see a brief onboarding explaining how Brainiac works | P1 |

### Reading Sessions

| ID | Story | Priority |
|----|-------|----------|
| READ-1 | As a user, I can paste text into a reading session | P0 |
| READ-2 | As a user, I can upload a plain-text or PDF file | P1 |
| READ-3 | As a user, I can title and save a reading session | P0 |
| READ-4 | As a user, I can view a list of my past sessions | P0 |
| READ-5 | As a user, I can delete a session I no longer need | P1 |

### AI Features

| ID | Story | Priority |
|----|-------|----------|
| AI-1 | As a user, I can generate an AI summary of my reading text | P0 |
| AI-2 | As a user, I can choose summary depth (brief / standard / detailed) | P1 |
| AI-3 | As a user, I can generate a comprehension quiz from my reading text | P0 |
| AI-4 | As a user, I can answer quiz questions and see my score | P0 |
| AI-5 | As a user, I can see explanations for incorrect answers | P1 |

### Progress & Analytics

| ID | Story | Priority |
|----|-------|----------|
| PROG-1 | As a user, I can see my quiz scores over time on a dashboard | P1 |
| PROG-2 | As a user, I can see my reading streak (consecutive days) | P2 |
| PROG-3 | As a user, I can filter sessions by date or score | P2 |

---

## 6. Functional Requirements

### 6.1 Authentication (Clerk)

- Email/password and social OAuth sign-in
- Session management with secure HTTP-only cookies
- Protected routes for all app features except `/sign-in` and `/sign-up`
- User identity synced to database via Clerk `userId`

### 6.2 Reading Session Management

- Create session with: title, source text, optional metadata (word count, source URL)
- Maximum text length: 50,000 characters (MVP); truncate with user warning beyond limit
- Sessions scoped to authenticated user only
- Timestamps: `createdAt`, `updatedAt`, `completedAt`

### 6.3 AI Summary Generation

- Input: session text + depth preference
- Output: structured summary (title, key points, optional vocabulary)
- Server-side Claude API call; no client exposure of API key
- Cache summary on session record to avoid redundant API calls
- Regenerate option invalidates cached summary

### 6.4 Quiz Generation & Scoring

- Generate 5–10 multiple-choice questions per session (configurable)
- Each question: prompt, 4 options, correct answer index, explanation
- User submits answers; server calculates score (percentage)
- Store quiz attempt with answers, score, and timestamp
- Allow retakes; keep history of attempts

### 6.5 Dashboard

- List recent sessions with title, date, quiz score badge
- Aggregate stats: total sessions, average score, current streak
- Empty state with CTA to create first session

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 2s (LCP); AI generation p95 < 15s |
| **Security** | All data scoped by user; secrets server-only; HTTPS only |
| **Accessibility** | WCAG 2.1 AA for core flows (sign-in, read, quiz) |
| **Scalability** | Stateless Next.js on Vercel; Supabase connection pooling |
| **Privacy** | User text stored encrypted at rest (Supabase); no training on user data |
| **Availability** | 99.5% uptime target for MVP |

---

## 8. Out of Scope (MVP)

- Collaborative reading / shared sessions
- Browser extension for web clipping
- Mobile native apps
- Organization / team workspaces (Clerk Orgs)
- Payment / subscription tiers
- Offline mode
- Multi-language UI (English only for MVP)

---

## 9. Technical Constraints

- **Frontend:** Next.js 15 App Router, React 19, Tailwind CSS 4
- **Auth:** Clerk (no custom auth)
- **Database:** Supabase PostgreSQL via Prisma ORM
- **AI:** Anthropic Claude API (server-side only)
- **Hosting:** Vercel

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude API latency or downtime | Poor UX | Loading states, retry logic, cached summaries |
| Long input texts exceed token limits | Failed generation | Chunking, truncation warnings, word count display |
| Quiz quality varies | User distrust | Prompt engineering, human review samples, feedback loop |
| Cost per user (API calls) | Margin pressure | Cache results, rate limit per user, monitor usage |

---

## 11. Milestones

| Phase | Deliverable | Target |
|-------|-------------|--------|
| **M0** | Auth + scaffold + docs | Complete |
| **M1** | Session CRUD + dashboard shell | Week 2 |
| **M2** | Summary generation | Week 3 |
| **M3** | Quiz generation + scoring | Week 4 |
| **M4** | Progress analytics + polish | Week 5 |
| **M5** | Beta launch | Week 6 |

---

## 12. Open Questions

- [ ] PDF parsing library choice (pdf-parse vs. external service)?
- [ ] Free tier API rate limits per user per day?
- [ ] Should summaries support markdown rendering in the reader view?
- [ ] Export sessions (PDF/JSON) in MVP or post-MVP?

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Session** | A single reading unit containing source text and derived AI outputs |
| **Summary** | Claude-generated condensed version of session text |
| **Quiz** | Set of multiple-choice questions generated from session text |
| **Attempt** | One completed quiz submission with score |
