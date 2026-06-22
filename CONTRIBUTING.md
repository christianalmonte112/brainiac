# Contributing to Brainiac

Thank you for your interest in contributing to **Brainiac**. This guide covers setup, conventions, and the workflow for submitting changes.

---

## Prerequisites

- Node.js 20 or later
- Git
- Access to required services (Clerk, Supabase, Anthropic) for full local development

---

## Development Setup

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/brainiac.git
   cd brainiac
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables** — copy the example from `README.md` into `.env.local` and fill in your keys.

4. **Set up the database** (when Prisma is configured):

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start the dev server:**

   ```bash
   npm run dev
   ```

---

## Branch Naming

Use descriptive branch names with a type prefix:

| Prefix | Use case |
|--------|----------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation only |
| `refactor/` | Code changes that neither fix bugs nor add features |
| `chore/` | Tooling, deps, config |

Examples: `feat/quiz-generation`, `fix/session-score-calculation`, `docs/update-schema`

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) with an optional emoji prefix:

```
✨ feat: add Claude summary generation for reading sessions
🐛 fix: prevent duplicate quiz submissions
📝 docs: document ReadingSession model
♻️ refactor: extract Anthropic client to lib/anthropic.ts
```

Keep the subject line under 72 characters. Use the body for context when the change is non-obvious.

---

## Code Style

### TypeScript

- Enable strict typing; avoid `any`.
- Prefer explicit return types on exported functions and Server Actions.
- Use path aliases (`@/`) as configured in `tsconfig.json`.

### React / Next.js

- Default to Server Components; use `"use client"` only when necessary.
- Co-locate feature-specific components under their route segment when small; shared components go in `components/`.
- Read `node_modules/next/dist/docs/` before using Next.js APIs — this project may use newer conventions.

### Styling

- Use Tailwind utility classes; avoid inline styles.
- Follow existing spacing, color, and typography patterns in `globals.css`.
- Ensure dark mode compatibility where the rest of the app supports it.

### Auth & Security

- Never expose `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `ANTHROPIC_API_KEY` to the client.
- Always validate the Clerk session server-side before reading or writing user data.
- Scope database queries to the authenticated user's `userId`.

---

## Pull Request Process

1. **Create a branch** from `main`.
2. **Make focused changes** — one feature or fix per PR when possible.
3. **Run linting** before submitting:

   ```bash
   npm run lint
   ```

4. **Update documentation** if your change affects:
   - Database schema → `docs/SCHEMA.md`
   - Architecture → `docs/ARCHITECTURE.md`
   - Features → `docs/FEATURES.md`
   - User-facing behavior → `README.md` and `CHANGELOG.md`

5. **Open a pull request** with:
   - A clear title (same style as commit messages)
   - Summary of what changed and why
   - Screenshots or screen recordings for UI changes
   - Test plan checklist

6. **Address review feedback** promptly. Squash fixup commits before merge if requested.

---

## Database Changes

When modifying `prisma/schema.prisma`:

1. Create a migration: `npx prisma migrate dev --name descriptive_name`
2. Update `docs/SCHEMA.md` with the new or changed models
3. Note breaking changes in `CHANGELOG.md` under `[Unreleased]`

Never edit migration files by hand unless you know exactly what you're doing.

---

## AI Feature Guidelines

Features that call the Anthropic Claude API must:

- Run server-side only
- Handle API errors gracefully (timeouts, rate limits, invalid responses)
- Log errors without leaking API keys or full user content in production logs
- Respect token limits — truncate or chunk long inputs when needed
- Include prompt versioning comments or constants for reproducibility

---

## Reporting Issues

When filing a bug report, include:

- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS (for UI issues)
- Relevant logs (redact secrets)

For feature requests, describe the user problem first, then your proposed solution.

---

## Questions?

Open a GitHub Discussion or issue. For architecture decisions, refer to `docs/ARCHITECTURE.md` and `docs/PRD.md` before proposing large changes.
