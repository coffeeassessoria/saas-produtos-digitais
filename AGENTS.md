# AI Engineering Guide

This file is the cross-tool source of truth for AI coding agents working in this repository (Claude Code, Codex and compatible agents).

## Product goal

Build a SaaS that helps small and medium businesses and agencies create marketing work faster by turning business context into structured, ready-to-use outputs such as campaigns, content plans, briefs and execution plans. The product should save the user from manually searching for the best prompt, skill or workflow. It is not a prompt marketplace.

## Working principles

1. Think before coding. Make assumptions explicit and resolve ambiguity before implementation.
2. Prefer the smallest change that fully solves the requested problem.
3. Do not refactor unrelated code, rename files broadly or introduce speculative abstractions.
4. Treat every task as a verifiable goal. Define acceptance criteria before implementation.
5. Reuse existing components, hooks, utilities and dependencies before adding new ones.
6. Keep business logic separate from UI when it has independent behavior or requires testing.
7. Never expose secrets, service-role credentials or private tokens in frontend code, logs, commits or documentation.
8. Database schema and Supabase changes must be migration-driven and backward-aware.
9. New behavior requires tests when the logic is non-trivial or regression-prone.
10. A task is not complete until lint, tests, typecheck and build are green or the blocker is explicitly documented.

## Current stack

- TypeScript
- React 18
- Vite 5
- React Router
- Tailwind CSS
- shadcn/ui + Radix UI
- TanStack React Query
- Supabase
- Zod
- React Hook Form
- Vitest + Testing Library
- ESLint
- npm as the canonical package manager

## Canonical commands

Use these exact commands unless package.json is intentionally changed as part of the task.

```bash
npm ci
npm run dev
npm run lint
npx tsc -b --noEmit
npm test
npm run build
```

## Repository conventions

- Frontend application code lives under `src/`.
- Route-level screens belong in `src/pages/`.
- Reusable presentational and domain components belong in `src/components/`.
- Reusable React behavior belongs in `src/hooks/`.
- Shared utilities belong in `src/lib/`.
- Supabase client/integration code belongs in `src/integrations/`.
- Shared TypeScript models belong in `src/types/` when they are used across features.
- Tests should stay close to the behavior they validate or under the existing test structure when that matches current project conventions.
- Supabase schema, migrations and server-side resources remain under `supabase/`.

## Architectural boundaries

### UI
UI components should render state and dispatch intent. Avoid embedding database access, provider-specific AI calls or complex orchestration directly inside components.

### Application/domain logic
Reusable workflows should be represented as explicit functions/hooks/services with typed inputs and outputs. Keep the initial architecture simple; introduce a new abstraction only after a concrete second use case appears or when isolation materially improves testing/security.

### Data access
Supabase access must be centralized enough that authentication, error handling and query behavior remain auditable. Never use service-role credentials in browser code.

### AI layer
AI prompts, workflow templates, model routing and usage accounting must not be scattered across components. Treat model/provider integration as an application service boundary. Log metadata needed for debugging and cost control, but do not log sensitive user content by default.

## Specialist routing

For multi-step work, the main agent acts as orchestrator and delegates independent scopes when the environment supports subagents.

| Specialist | Use when |
|---|---|
| `product-planner` | Clarifying feature scope, user journey, acceptance criteria and MVP boundaries. |
| `frontend-specialist` | React pages, components, responsive UI, forms, accessibility and client state. |
| `backend-specialist` | Server-side/API logic, Supabase functions and service integration. |
| `database-specialist` | Schema, migrations, RLS policies, indexes and query design. |
| `ai-specialist` | Prompt/workflow architecture, model routing, structured outputs and token/cost controls. |
| `test-engineer` | Unit/integration tests, regression tests and edge cases. |
| `security-reviewer` | Auth, RLS, secrets, user input, external integrations and sensitive data paths. |
| `code-reviewer` | Final review for correctness, maintainability, scope creep and missing tests. |

Parallel work is allowed only when specialists do not edit the same files or depend on unfinished changes from one another.

## Definition of done

Before declaring a coding task complete:

1. Acceptance criteria are satisfied.
2. No unrelated files were changed.
3. `npm run lint` passes.
4. `npx tsc -b --noEmit` passes.
5. `npm test` passes.
6. `npm run build` passes.
7. Security-sensitive changes received an explicit security review.
8. Any architecture or product decision that future agents need is recorded under `docs/`.

## Git workflow

- `main` is protected conceptually as the stable branch.
- Work in short-lived branches: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
- Prefer small, coherent commits.
- Do not mix refactors with feature work unless the refactor is required for the feature.
- Pull requests should explain goal, scope, validation performed, risks and screenshots for UI changes.

## Safety constraints

- Never print or copy `.env` contents into chat, issues, PRs or documentation.
- Do not commit new secrets.
- Any tracked environment file must be audited before production deployment.
- Validate authorization in addition to authentication.
- For Supabase, review RLS for every user-owned or tenant-owned table.
- Treat AI-generated structured data as untrusted input and validate it with schemas such as Zod before use.
