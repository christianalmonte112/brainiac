# Roadmap — Brainiac

**Last updated:** July 2026

This roadmap outlines the development phases for Brainiac from MVP through post-launch enhancements. Timelines are estimates and may shift based on feedback and priorities.

---

## Vision

Brainiac becomes the go-to tool for **active reading** — where every reading session ends with measurable comprehension, not passive consumption.

---

## Phase 0 — Foundation ✅

**Status:** Complete  
**Target:** June 2025

| Item | Status |
|------|--------|
| Next.js App Router scaffold | ✅ |
| TypeScript + Tailwind CSS 4 | ✅ |
| Clerk auth (sign-in, sign-up, middleware) | ✅ |
| Project documentation | ✅ |
| Vercel-ready configuration | ✅ |

**Exit criteria:** Authenticated users can sign in; protected routes work; docs describe the full product vision.

---

## Phase 1 — Core Data Layer ✅

**Status:** Complete  
**Target:** June 2025

| Item | Priority | Status |
|------|----------|--------|
| Prisma schema implementation | P0 | ✅ |
| Supabase project + connection pooling | P0 | ✅ |
| Initial migration (`User`, `ReadingSession`, `Summary`, `Quiz`, `Question`, `QuizAttempt`) | P0 | ✅ |
| GitHub repo created | P0 | ✅ |
| Full documentation suite | P0 | ✅ |
| Deployed to Vercel | P0 | ✅ |

**Exit criteria:** Database connected, schema migrated, app deployed to production. ✅

---

## Phase 2 — Onboarding & Core Reader ✅

**Status:** Complete  
**Completed:** June 2026

> **Build order:** Onboarding baseline assessment comes **first**, before the chunk reader.

| Item | Priority | Feature | Description |
|------|----------|---------|-------------|
| Onboarding baseline assessment | P0 | F-017 | 5-minute test: reading speed, comprehension, vocabulary, inference | ✅ |
| Core reader UI and layout | P0 | — | Reader shell, navigation, session layout | ✅ |
| Chunk reader with progressive unlock | P0 | — | Text delivered in chunks; next chunk unlocks after comprehension check | ✅ |
| Micro-summarization | P1 | — | Short AI summaries per chunk | ✅ |
| Vocabulary mapper | P1 | — | Highlight and define unfamiliar words inline | ✅ |
| Progress dashboard | P1 | F-006 | Session history, stats vs. baseline | ✅ |
| Anthropic SDK integration | P0 | — | `@anthropic-ai/sdk` installed; server-side Claude client | ✅ |

**Exit criteria:** New users complete baseline assessment; can read text in progressive chunks; dashboard shows progress vs. baseline. ✅

---

## Phase 3 — AI & Voice

**Status:** In Progress (Core scope complete; multilingual rollout deferred)  
**Started:** June 2026

| Item | Priority | Feature | Description | Status |
|------|----------|---------|-------------|--------|
| AI summary scoring | P0 | F-003 | Claude scores each chunk micro-summary 0–100 with encouraging feedback | ✅ |
| Admin analytics dashboard | P0 | F-019 | `/admin` — signups, assessment completion, session activity; owner-only gate | ✅ |
| AI summaries (full session) | P0 | F-004 | Claude-powered summaries at configurable depth | ✅ |
| Comprehension quizzes | P0 | F-005 | Auto-generated MCQ quizzes with scoring | ✅ |
| Image/photo upload (OCR via Claude Vision) | P1 | F-018 | Upload photo of book page or printed text; extract text into chunk reader | ✅ |
| Voice Reader with celebrity-style voices | P1 | F-010 | Text-to-speech via ElevenLabs API | ✅ |
| Multilingual support — language selection, translated assessment & UI, multilingual TTS | P1 | F-011 | Language picker before onboarding; saves to User.preferredLanguage; drives assessment translation, UI locale, TTS voice | 🔲 Planned |
| Voice summarization | P2 | F-012 | User records their own spoken summary; AI evaluates comprehension | ✅ |
| Spanish language support milestone | P1 | F-011b | Spanish-first rollout: language selection before onboarding + Spanish translated assessment/content | 🔲 Planned |

**Exit criteria:** AI summary scoring, admin analytics, full-session summaries, quizzes, voice reader, voice summarization, and photo upload are live ✅. Multilingual work (F-011/F-011b) remains deferred.

### Phase 3 Stability Check (July 2026)

- Completed focused bug hunts for both Phase 2 and Phase 3 surfaces.
- Latest quality gates pass: `npm run lint` ✅ and `npm run build` ✅.
- No known blocking defects remain for entering Phase 4 planning/implementation.

### Remaining Phase 3 Build Order (Authoritative)

1. **F-011 — Multilingual Support** (language selection, translated onboarding/UI, multilingual TTS defaults)
2. **F-011b — Spanish Language Support Milestone** (ship Spanish end-to-end as the first multilingual rollout)

---

## Phase 4 — Games & Community

**Status:** Planned  
**Target:** Week 5–7

| Item | Priority | Feature | Description |
|------|----------|---------|-------------|
| Visual learning games | P2 | F-013 | ✅ Shipped — matching + sequencing generated per session |
| Memory games | P2 | F-014 | ✅ Shipped — vocabulary flashcards with spaced repetition |
| Listening games with AI-broken-down song lyrics | P2 | F-015 | ✅ Shipped — user-pasted lyrics, TTS segments, blanks + questions |
| Reddit-style community platform | P2 | F-016 | 🚧 MVP shipped — posts + threaded comments + delete-own; votes/moderation planned |
| Dashboard analytics & streaks | P1 | F-006 | Avg score, session count, reading streak |
| Landing page redesign | P1 | — | Brainiac branding, value prop, CTA |
| Responsive mobile layout | P1 | — | Core flows work on mobile |

**Exit criteria:** Games available for practice; community platform MVP live; dashboard shows meaningful progress data.

---

## Phase 5 — Beta Launch

**Status:** Planned  
**Target:** Week 7–8

| Item | Priority | Description |
|------|----------|-------------|
| Environment hardening | P0 | Secrets, rate limits, CORS |
| User sync via Clerk webhook | P0 | Create/update `User` on sign-up |
| Monthly progress report vs. baseline | P1 | Email or in-app report showing growth since F-017 |
| Feedback widget | P2 | In-app feedback collection |
| Beta user invite list | P1 | Controlled rollout |
| E2E tests with Playwright + Clerk | P2 | Auth and core flow coverage |
| Performance testing | P1 | Load test AI endpoints |

**Exit criteria:** 10–50 beta users completing full sessions without critical bugs.

---

## Post-MVP Backlog

Prioritized ideas for after beta launch. Not committed to dates.

### Near-term (Q3 2026)

| Feature | Value | Effort |
|---------|-------|--------|
| PDF upload & text extraction | High | Medium |
| URL import (article scraping) | High | Medium |
| Export session (PDF / Markdown) | Medium | Low |
| Dark mode polish | Medium | Low |
| Email digest (weekly progress) | Medium | Medium |

### Mid-term (Q4 2026)

| Feature | Value | Effort |
|---------|-------|--------|
| Spaced repetition review | High | High |
| Custom quiz difficulty | Medium | Low |
| Tags and folders for sessions | Medium | Medium |
| Browser extension (clip to Brainiac) | High | High |
| API rate limiting per user tier | High | Medium |

### Long-term (2026+)

| Feature | Value | Effort |
|---------|-------|--------|
| Team / classroom mode (Clerk Orgs) | High | High |
| Subscription billing | High | High |
| Mobile native apps | Medium | Very High |
| Integration with Readwise / Notion | Medium | Medium |

---

## Technical Debt Tracker

| Item | Phase to Address | Status |
|------|------------------|--------|
| Rename package from `readwise-app` to `brainiac` | Phase 2 | ✅ Done |
| Add Zod validation for all Server Actions | Phase 2 | ✅ Done |
| Prisma client singleton for serverless | Phase 2 | ✅ Done |
| `BaselineAssessment` migration | Phase 2 | ✅ Done |
| Remove temporary `as any` cast in `actions.ts` after AI scoring migration | Phase 3 | ✅ Done |
| E2E tests with Playwright + Clerk testing | Phase 5 | 🔲 Pending |
| CI pipeline (lint, typecheck, migrate) | Phase 5 | 🔲 Pending |

---

## How to Propose Changes

1. Open a GitHub Issue with the `roadmap` label
2. Describe the user problem, not just the feature
3. Reference which phase it fits (or propose a new phase)
4. Maintainers will prioritize against current phase goals

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full contribution process.
