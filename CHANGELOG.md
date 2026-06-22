# Changelog

All notable changes to **Brainiac** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Full project documentation (README, PRD, Architecture, Schema, Features, Roadmap)
- Clerk authentication integration with sign-in and sign-up pages
- Auth middleware via `proxy.ts` protecting all non-public routes
- Next.js App Router scaffold with Tailwind CSS 4 and TypeScript

### Planned

- Prisma schema and Supabase database connection
- Reading session CRUD and text input UI
- Claude-powered summary generation
- Comprehension quiz generation and scoring
- User dashboard with session history and progress stats

---

## [0.1.0] — 2025-06-22

### Added

- Initial project scaffold via `create-next-app`
- Clerk `@clerk/nextjs` integration
- Geist font and base Tailwind styling
- ESLint configuration

[Unreleased]: https://github.com/christianalmonte/brainiac/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/christianalmonte/brainiac/releases/tag/v0.1.0
