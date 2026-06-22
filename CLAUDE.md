@AGENTS.md

# Brainiac — Claude Context

This file gives AI assistants project-specific context when working in the Brainiac codebase.

## Project Overview

**Brainiac** is an AI reading comprehension app. Users authenticate via Clerk, store reading sessions and progress in Supabase (PostgreSQL via Prisma), and interact with Anthropic Claude for summaries, quizzes, and comprehension analysis.

## Stack

- **Next.js 15+** — App Router, Server Components, Server Actions, Route Handlers
- **TypeScript** — Strict mode; no `any` unless unavoidable
- **Tailwind CSS 4** — Utility-first styling; use existing design tokens in `globals.css`
- **Clerk** — Auth; middleware lives in `proxy.ts` (not `middleware.ts`)
- **Supabase** — Managed PostgreSQL; use service role key only on the server
- **Prisma** — ORM; schema in `prisma/schema.prisma`
- **Anthropic Claude API** — All AI features; never expose API keys to the client
- **Vercel** — Production hosting

## Key Conventions

### Next.js

- Read guides in `node_modules/next/dist/docs/` before writing Next.js code — this project may use APIs that differ from your training data.
- Prefer Server Components; add `"use client"` only when hooks or browser APIs are required.
- Use Server Actions for mutations; Route Handlers (`app/api/`) for webhooks and external integrations.
- Auth middleware is in **`proxy.ts`**, exported as default with a `config.matcher`. Public routes: `/sign-in`, `/sign-up`.

### Auth (Clerk)

- Wrap the app in `<ClerkProvider>` in `app/layout.tsx`.
- Use `auth()` from `@clerk/nextjs/server` in Server Components and Server Actions.
- Protect API routes with Clerk session validation; never trust client-supplied user IDs.

### Database (Prisma + Supabase)

- All DB access goes through Prisma Client — no raw SQL in components.
- User records are keyed by Clerk `userId` (string), not Supabase Auth UUIDs.
- Run `npx prisma migrate dev` after schema changes; update `docs/SCHEMA.md`.

### AI (Anthropic)

- Call Claude from server-only code (Server Actions or Route Handlers).
- Use structured prompts; return JSON for quizzes and structured data.
- Handle rate limits and token limits gracefully; stream long responses when appropriate.
- Model default: `claude-sonnet-4-20250514` unless a feature specifies otherwise.

### File Organization

```
app/
  (dashboard)/          # Authenticated app routes
  api/                  # Route handlers (AI, webhooks)
  sign-in/              # Clerk sign-in
  sign-up/              # Clerk sign-up
lib/
  prisma.ts             # Prisma client singleton
  anthropic.ts          # Claude client wrapper
  supabase/             # Supabase helpers (if needed)
components/             # Shared UI components
```

### Environment Variables

Never commit secrets. Required vars are documented in `README.md`. Validate env at startup in server modules where practical.

## Documentation

Before implementing features, read:

- `docs/PRD.md` — Product requirements and user stories
- `docs/ARCHITECTURE.md` — System design
- `docs/SCHEMA.md` — Database models
- `docs/FEATURES.md` — Feature specs
- `docs/ROADMAP.md` — Priority and phasing

## What NOT to Do

- Do not add client-side Anthropic or Supabase service-role calls.
- Do not create `middleware.ts` — auth middleware is `proxy.ts`.
- Do not bypass Clerk auth for "temporary" testing in committed code.
- Do not add dependencies without a clear need; prefer existing stack.
- Do not overwrite `.env.local` or commit credentials.

## Commit Style

Use conventional commits with emoji prefix when appropriate:

```
✨ feat: add reading session quiz generation
🐛 fix: correct quiz score calculation
📝 docs: update schema reference
```
