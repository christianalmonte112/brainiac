# Roadmap — Brainiac

**Last updated:** June 2025

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

## Phase 1 — Core Data Layer

**Status:** Planned  
**Target:** Week 1–2

| Item | Priority | Description |
|------|----------|-------------|
| Prisma schema implementation | P0 | Models per `docs/SCHEMA.md` |
| Supabase project + connection pooling | P0 | Dev and prod databases |
| User sync via Clerk webhook | P0 | Create/update `User` on sign-up |
| Reading session CRUD | P0 | Create, read, update, delete sessions |
| Dashboard shell | P0 | Session list with empty state |

**Exit criteria:** Users can create, view, and delete reading sessions; data persists in Supabase.

---

## Phase 2 — AI Summaries

**Status:** Planned  
**Target:** Week 2–3

| Item | Priority | Description |
|------|----------|-------------|
| Anthropic client wrapper | P0 | `lib/anthropic.ts` with error handling |
| Summary generation Server Action | P0 | Claude-powered summaries |
| Summary depth selector | P1 | Brief / standard / detailed |
| Summary caching | P0 | Store on session; skip re-generation |
| Loading & error states | P0 | UX for async AI calls |
| Word count + limit warnings | P1 | Pre-flight validation |

**Exit criteria:** Users generate and view AI summaries for any session text.

---

## Phase 3 — Comprehension Quizzes

**Status:** Planned  
**Target:** Week 3–4

| Item | Priority | Description |
|------|----------|-------------|
| Quiz generation via Claude | P0 | Structured JSON output |
| Quiz UI (multiple choice) | P0 | Interactive client component |
| Answer submission + scoring | P0 | Server-side score calculation |
| Results screen with explanations | P0 | Show correct/incorrect + rationale |
| Quiz retakes | P1 | Multiple attempts per quiz |
| Session completion flow | P1 | Mark session COMPLETED after quiz |

**Exit criteria:** Full read → summarize → quiz → score loop works end-to-end.

---

## Phase 4 — Progress & Polish

**Status:** Planned  
**Target:** Week 4–5

| Item | Priority | Description |
|------|----------|-------------|
| Dashboard analytics | P1 | Avg score, session count, recent activity |
| Reading streak | P2 | Consecutive days with activity |
| Session search / filter | P2 | By date, title, score |
| Landing page redesign | P1 | Brainiac branding, value prop, CTA |
| Responsive mobile layout | P1 | Core flows work on mobile |
| Accessibility audit | P1 | WCAG 2.1 AA for auth + quiz flows |
| Error monitoring (Sentry) | P2 | Production error tracking |

**Exit criteria:** App feels polished; dashboard shows meaningful progress data.

---

## Phase 5 — Beta Launch

**Status:** Planned  
**Target:** Week 5–6

| Item | Priority | Description |
|------|----------|-------------|
| Production deployment | P0 | Vercel + Supabase prod |
| Environment hardening | P0 | Secrets, rate limits, CORS |
| Onboarding flow | P1 | First-session guided tour |
| Feedback widget | P2 | In-app feedback collection |
| Beta user invite list | P1 | Controlled rollout |
| Performance testing | P1 | Load test AI endpoints |

**Exit criteria:** 10–50 beta users completing full sessions without critical bugs.

---

## Post-MVP Backlog

Prioritized ideas for after beta launch. Not committed to dates.

### Near-term (Q3 2025)

| Feature | Value | Effort |
|---------|-------|--------|
| PDF upload & text extraction | High | Medium |
| URL import (article scraping) | High | Medium |
| Export session (PDF / Markdown) | Medium | Low |
| Dark mode polish | Medium | Low |
| Email digest (weekly progress) | Medium | Medium |

### Mid-term (Q4 2025)

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
| Multi-language support | Medium | High |
| Mobile native apps | Medium | Very High |
| Integration with Readwise / Notion | Medium | Medium |

---

## Technical Debt Tracker

| Item | Phase to Address |
|------|------------------|
| Rename package from `readwise-app` to `brainiac` | Phase 1 |
| Add Zod validation for all Server Actions | Phase 2 |
| Prisma client singleton for serverless | Phase 1 |
| E2E tests with Playwright + Clerk testing | Phase 4 |
| CI pipeline (lint, typecheck, migrate) | Phase 5 |

---

## How to Propose Changes

1. Open a GitHub Issue with the `roadmap` label
2. Describe the user problem, not just the feature
3. Reference which phase it fits (or propose a new phase)
4. Maintainers will prioritize against current phase goals

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full contribution process.
