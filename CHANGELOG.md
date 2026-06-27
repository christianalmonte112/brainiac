# Changelog

All notable changes to **Brainiac** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned

- F-017: Onboarding baseline assessment (reading speed, comprehension, vocabulary, inference)
- Core reader UI and chunk reader with progressive unlock
- Anthropic SDK integration for AI summaries and quizzes
- Micro-summarization and vocabulary mapper
- Progress dashboard with baseline comparison

---

## [0.2.0] — 2025-06-22

### Added — Phase 1 Complete ✅

- Next.js 15 scaffolded with App Router, TypeScript, and Tailwind CSS 4
- Clerk auth installed and working (sign-in, sign-up, route protection via `proxy.ts`)
- GitHub repo created and connected
- Full documentation suite created (README, PRD, Architecture, Schema, Features, Roadmap, Contributing)
- Supabase database connected with pooled and direct connection URLs
- Prisma schema migrated with tables: `User`, `ReadingSession`, `Summary`, `Quiz`, `Question`, `QuizAttempt`
- Deployed to Vercel at [brainiac.vercel.app](https://brainiac.vercel.app)

---

## [0.1.0] — 2025-06-22

### Added

- Initial project scaffold via `create-next-app`
- Clerk `@clerk/nextjs` integration
- Geist font and base Tailwind styling
- ESLint configuration
- Full project documentation (README, PRD, Architecture, Schema, Features, Roadmap)
- Auth middleware via `proxy.ts` protecting all non-public routes

[Unreleased]: https://github.com/christianalmonte/brainiac/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/christianalmonte/brainiac/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/christianalmonte/brainiac/releases/tag/v0.1.0
