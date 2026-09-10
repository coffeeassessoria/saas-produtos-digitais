@AGENTS.md

# Claude Code Project Memory

Use `AGENTS.md` as the shared engineering source of truth. This file contains Claude Code-specific execution guidance only.

## Session startup

Before implementing a non-trivial task:

1. Read `AGENTS.md`.
2. Read the relevant files under `docs/` for product/architecture context.
3. Inspect existing code before proposing a new pattern.
4. Restate the task as acceptance criteria.
5. For ambiguous or multi-step work, use a brainstorm/planning workflow before coding.

## Execution mode

The primary session should coordinate and review. When subagents are available, delegate isolated implementation/review scopes to specialists defined in `AGENTS.md`.

Do not dispatch parallel agents that will edit the same file set.

## Verification loop

For code changes, execute the relevant checks and do not rely on visual inspection alone:

```bash
npm run lint
npx tsc -b --noEmit
npm test
npm run build
```

If a command fails because the baseline is already broken, identify whether the failure predates the task. Do not silently fix unrelated baseline failures.

## Change discipline

- Prefer surgical edits.
- Reuse existing UI primitives and dependencies.
- Avoid introducing new packages unless the existing stack cannot reasonably solve the requirement.
- Do not generate speculative admin panels, configuration layers, queues, caches or abstractions without a concrete MVP requirement.
- Keep files focused. If a file becomes difficult to reason about, split by responsibility rather than arbitrary line count.

## Supabase

Before schema/auth/data changes:

- inspect current migrations and integration code;
- preserve RLS and tenant/user isolation;
- never expose service-role credentials to Vite/browser code;
- use migrations for persistent schema changes;
- document significant schema decisions in `docs/ARCHITECTURE.md` or an ADR.

## AI features

AI functionality must have explicit:

- typed input;
- validated structured output where possible;
- provider/model boundary;
- usage/cost measurement point;
- failure/fallback behavior appropriate to the MVP;
- no secret provider keys in browser-delivered code.

## Git

Work from a task branch, keep commits coherent, and summarize validation in the PR. Never force-push shared branches unless explicitly instructed.

## End-of-session memory

Before ending substantial work, update the relevant `docs/` file when you discovered a durable product, architecture, security or workflow decision. Do not fill documentation with transient debugging notes.
