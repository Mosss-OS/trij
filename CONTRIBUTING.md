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

| Mode       | File                        | Use case                      |
| ---------- | --------------------------- | ----------------------------- |
| **WebLLM** | `gemma.ts` → `WebLLMEngine` | Production on-device (WebGPU) |
| **Ollama** | `gemma.ts` → `OllamaEngine` | Development / laptop demo     |
| **Demo**   | `gemma.ts` → `DemoEngine`   | Testing UI without a model    |

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

| Variable                 | Required | Description                                   |
| ------------------------ | -------- | --------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL                          |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anon/public key                      |
| `VITE_OLLAMA_URL`        | No       | Default Ollama URL (`http://localhost:11434`) |
| `VITE_OLLAMA_MODEL`      | No       | Default Ollama model (`gemma4`)               |

## Security notes

- **Never** commit `.env` files or secrets
- **Never** send patient data to external AI APIs
- All AI inference runs on-device (WebLLM / Ollama)
- Supabase RLS policies must be reviewed for each new table
- Patient data is encrypted at rest in IndexedDB

## Community Contributions

Tri welcomes contributions from clinicians, translators, and developers to improve protocol content and translations.

### Protocol Contributions

**Protocol content includes**: Clinical assessment guidelines, triage protocols, referral criteria, and medical safety rules.

#### Submission Process

1. **Fork and branch**: Create a fork of `trij` and a branch named `protocol/condition-name`
2. **Use the template**: Copy `.github/templates/PROTOCOL_SUBMISSION.md` for your proposal
3. **Clinical review required**: All protocol changes must be reviewed by at least one licensed clinician
4. **Submit PR**: Include `Closes #XXX` referencing the tracking issue (create one if needed)
5. **Testing**: Test in Demo mode with sample cases before submitting

#### Protocol Submission Template

```markdown
## Protocol Proposal: [Condition Name]

### Clinical Background
- Brief description of condition
- Target patient population
- Epidemiological context (region/setting)

### Proposed Changes
- [ ] New protocol (first-time addition)
- [ ] Protocol update (modifying existing protocol)
- [ ] Protocol deprecation (removing outdated protocol)

### Clinical Evidence
- Primary guidelines referenced (WHO, national guidelines, etc.)
- Key studies supporting recommendations
- Any regional variations considered

### Safety Considerations
- Red flag symptoms to include
- Contraindications for local care
- Required referral criteria
- Potential misdiagnosis risks

### Testing Plan
- [ ] Tested with 5+ sample cases
- [ ] Verified urgency classifications
- [ ] Confirmed referral triggers work correctly
- [ ] Checked for conflicts with existing protocols

### Clinician Attestation
I confirm that I am a licensed clinician and have reviewed this protocol for clinical accuracy.

- Name: [Your Name]
- License: [License Number/Jurisdiction]
- Date: [YYYY-MM-DD]
```

### Translation Contributions

**Translation scope**: Interface strings, protocol text, voice guidance, and documentation.

#### Submission Process

1. **Language eligibility**: New languages require regional CHW deployment (minimum 100 users planned)
2. **Translation quality**: Native speaker proficiency required
3. **Medical terminology**: Must have medical translation experience or clinician review
4. **Use the template**: Copy `.github/templates/TRANSLATION_SUBMISSION.md` 
5. **Context testing**: Test the translated interface in-app before submission

#### Translation Submission Template

```markdown
## Translation Proposal: [Language Name]

### Language Information
- Language: [Language Name]
- ISO 639-1 Code: [XX]
- Target region: [Country/Region]
- Script: [Latin/Arabic/Devanagari/etc.]

### Translator Qualifications
- [ ] Native speaker proficiency
- [ ] Medical translation experience
- [ ] Familiarity with CHW terminology
- [ ] Clinician reviewer available (if not medically trained)

### Scope of Translation
- [ ] Full interface translation (all strings)
- [ ] Protocol translation (medical content only)
- [ ] Voice guidance scripts
- [ ] Documentation

### Quality Assurance
- [ ] Reviewed by native speaker
- [ ] Medical terminology verified by clinician
- [ ] Tested in-app with RTL/LTR layout as appropriate
- [ ] Cultural appropriateness verified

### Clinical Attestation (if translating medical content)
I confirm that medical terminology in this translation has been reviewed for accuracy.

- Clinician Name: [Name]
- Credentials: [Credentials]
- Date: [YYYY-MM-DD]
```

### Review Process

#### Clinical Content Review
- **Required for**: All protocol submissions, medical content translations
- **Reviewer qualifications**: Licensed clinician (MD, RN, or equivalent)
- **Review checklist**:
  - [ ] Clinical accuracy verified
  - [ ] Safety rules appropriate
  - [ ] Referral criteria sound
  - [ ] No conflicts with standard of care
- **Approval**: Comment `Clinical review approved` on the PR

#### Translation Review
- **Required for**: All translation submissions
- **Reviewer qualifications**: Native speaker + medical terminology check
- **Review checklist**:
  - [ ] Natural phrasing and cultural appropriateness
  - [ ] Medical terms accurately translated
  - [ ] Consistent with existing terminology
  - [ ] UI layout tested (text expansion, RTL support)
- **Approval**: Comment `Translation review approved` on the PR

### Contributor Credits

Contributors to protocols and translations are credited in release notes:

- **Protocol authors**: Listed as "Clinical contributor" with condition name
- **Translators**: Listed as "Translation contributor" with language
- **Reviewers**: Listed as "Clinical reviewer" or "Translation reviewer"

To receive credit, ensure your GitHub username is visible in your commit messages.

### Automated Validation

All protocol and translation submissions must pass automated CI checks:

#### JSON Schema Validation
Protocol files are validated against `src/data/protocol-schema.json`. The CI will fail if:
- Required fields are missing
- Data types don't match the schema
- Enum values are invalid
- Referenced conditions don't exist

#### Translation Completeness
Translation files are checked for:
- Missing translation keys (compared to English base)
- Duplicate keys
- Invalid placeholder syntax (e.g., `{variable}`)
- RTL language markers where appropriate

#### Build Validation
All contributions must pass:
- `npx tsc --noEmit` (TypeScript type checking)
- `bun run lint` (Code style)
- `bun run build` (Production build)

### Community Calls

Monthly community calls are held for contributors:
- **Schedule**: First Thursday of each month, 15:00 UTC
- **Topics**: Protocol discussions, translation coordination, feature planning
- **Announcement**: Posted in GitHub Discussions 1 week prior
- **Recording**: Posted to GitHub Discussions for async participation

## Questions?

Open a [Discussion](https://github.com/Mosss-OS/trij/discussions) or tag a maintainer in your PR.
