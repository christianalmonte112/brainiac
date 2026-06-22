# Brainiac

**Brainiac** is an AI-powered reading comprehension app that helps learners read smarter, retain more, and understand deeply. Upload or paste text, get AI-generated summaries and quizzes, track progress over time, and build lasting reading habits.

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15+](https://nextjs.org) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Auth | [Clerk](https://clerk.com) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| ORM | [Prisma](https://www.prisma.io) |
| AI | [Anthropic Claude API](https://docs.anthropic.com) |
| Deployment | [Vercel](https://vercel.com) |

---

## Features

- **Smart reading sessions** — Paste or upload text and read with AI-assisted comprehension tools
- **AI summaries** — Claude generates concise summaries at configurable depth
- **Comprehension quizzes** — Auto-generated questions to test understanding
- **Progress tracking** — Session history, scores, and reading streaks
- **Secure auth** — Sign in/up via Clerk with protected routes

See [docs/FEATURES.md](./docs/FEATURES.md) for the full feature list and [docs/ROADMAP.md](./docs/ROADMAP.md) for what's planned next.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm (or pnpm / yarn)
- Accounts: [Clerk](https://dashboard.clerk.com), [Supabase](https://supabase.com), [Anthropic](https://console.anthropic.com)

### 1. Clone and install

```bash
git clone https://github.com/christianalmonte/brainiac.git
cd brainiac
npm install
```

### 2. Environment variables

Create `.env.local` in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (Prisma)
DATABASE_URL=postgresql://...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Database setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in to access protected routes.

---

## Project Structure

```
brainiac/
├── app/                  # Next.js App Router pages and layouts
│   ├── sign-in/          # Clerk sign-in
│   ├── sign-up/          # Clerk sign-up
│   └── ...
├── docs/                 # Project documentation
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
├── proxy.ts              # Clerk auth middleware (route protection)
├── AGENTS.md             # AI agent rules (Next.js conventions)
└── CLAUDE.md             # Claude-specific project context
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PRD.md](./docs/PRD.md) | Product requirements |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design and data flow |
| [docs/SCHEMA.md](./docs/SCHEMA.md) | Database schema reference |
| [docs/FEATURES.md](./docs/FEATURES.md) | Feature specifications |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Development roadmap |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

---

## Deployment

Brainiac is designed for [Vercel](https://vercel.com). Connect your GitHub repo, add environment variables in the Vercel dashboard, and deploy. Prisma migrations run via your CI/CD pipeline or manually against the production database.

---

## License

Private — all rights reserved.
