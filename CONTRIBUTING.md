# Contributing to Trij

Thanks for your interest in contributing! Trij is an offline-first AI medical triage PWA for community health workers. Please follow these guidelines to keep the codebase consistent and safe.

## Prerequisites

- Node.js 20+
- [Bun](https://bun.sh) (recommended package manager)
- (Optional) [Ollama](https://ollama.com) for local Gemma 4 inference
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for local DB

## Quick start

```bash
git clone https://github.com/Mosss-OS/trij.git
cd trij
bun install
cp .env.example .env   # fill in your Supabase credentials
bun run dev
```

Open http://localhost:5173.

## Project structure

```
src/
├── routes/          # TanStack file routes (one file = one route)
├── components/      # Reusable UI components (shadcn/ui + custom)
├── lib/             # Core logic: AI engine, DB, sync, voice, referral
├── hooks/           # React hooks
├── stores/          # Zustand state stores
└── types/           # TypeScript type definitions
```

## Code conventions

### TypeScript

- **strict mode** — `tsconfig.json` has `strict: true`. No `any` unless absolutely necessary.
- **Naming**:
  - Files: `kebab-case.ts` (e.g., `gemma-prompt.ts`, `useOnlineStatus.ts`)
  - Components: `PascalCase.tsx` (e.g., `AssessmentResult.tsx`)
  - Functions/variables: `camelCase`
  - Types/interfaces: `PascalCase`
- **Imports**: Use `@/` alias for `src/` (e.g., `import { db } from '@/lib/db'`)

### Database (Supabase / Dexie)

- **Supabase columns**: `snake_case` in SQL migrations, `camelCase` in TypeScript — mapped explicitly in `src/lib/sync.ts`
- **Dexie tables**: Defined in `src/lib/db.ts`. Add new stores via `db.version().stores()`

### AI engine

Three engine modes defined in `src/lib/gemma.ts`:

| Mode | File | Use case |
|---|---|---|
| **WebLLM** | `gemma.ts` → `WebLLMEngine` | Production on-device (WebGPU) |
| **Ollama** | `gemma.ts` → `OllamaEngine` | Development / laptop demo |
| **Demo** | `gemma.ts` → `DemoEngine` | Testing UI without a model |

When adding a new engine feature:
1. Add to the interface in `src/types/trij.ts`
2. Implement in each engine class
3. Add tests in the corresponding test file

### Styling

- Tailwind CSS v4 utility classes
- shadcn/ui components in `src/components/ui/`
- Custom components follow shadcn patterns (Radix primitives + Tailwind)

## Pull request process

### 1. Branch naming

```
feat/short-description    # new features
fix/short-description     # bug fixes
chore/short-description   # tooling, config, docs
refactor/short-description
```

### 2. Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add voice-guided triage in Swahili
fix: resolve camera flash on Safari iOS
chore: bump vite to 6.3
docs: update SRS with sync protocol
```

### 3. Before submitting

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `bun run lint` has no warnings
- [ ] `bun run build` succeeds
- [ ] Tested with Demo mode engine
- [ ] (If applicable) Added/updated unit tests

### 4. PR title and description

- Title matches the commit message style
- Description references the issue: `Closes #123`
- Include screenshots for UI changes
- Mention which AI engine(s) were tested

### 5. Review and merge

- PRs require at least one review
- Merge via **squash merge** to keep history clean
- Delete the branch after merge

## Testing

- **Unit tests**: `bun test` for lib/ utility functions
- **TypeScript**: `npx tsc --noEmit` for full type check
- **Lint**: `bun run lint`
- **Build**: `bun run build`
- **Accessibility**: axe-core scans per route (see `tests/a11y/`)

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_OLLAMA_URL` | No | Default Ollama URL (`http://localhost:11434`) |
| `VITE_OLLAMA_MODEL` | No | Default Ollama model (`gemma4`) |

## Security notes

- **Never** commit `.env` files or secrets
- **Never** send patient data to external AI APIs
- All AI inference runs on-device (WebLLM / Ollama)
- Supabase RLS policies must be reviewed for each new table
- Patient data is encrypted at rest in IndexedDB

## Questions?

Open a [Discussion](https://github.com/Mosss-OS/trij/discussions) or tag a maintainer in your PR.
