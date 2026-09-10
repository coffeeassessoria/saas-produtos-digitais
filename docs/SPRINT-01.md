# Sprint 01 — Foundation and First Vertical Slice

## Goal

Turn the current prototype into a development-ready SaaS foundation and prove one complete marketing workflow end to end.

## Sprint outcome

At the end of this sprint, a developer/agent should be able to clone the repository, install dependencies, run the app, authenticate, create or select a business profile, execute one curated marketing workflow, receive a structured result, persist it, and retrieve it from history.

## Workstream A — Engineering baseline

### A1. Validate repository baseline

Acceptance criteria:

- `npm ci` completes;
- `npm run lint` status is known;
- `npx tsc -b --noEmit` status is known;
- `npm test` status is known;
- `npm run build` status is known;
- existing failures are documented before unrelated fixes.

### A2. Environment and secret hygiene

Acceptance criteria:

- audit whether `.env` is tracked and whether it contains any secret that should not exist in git history;
- create/verify `.env.example` containing variable names only;
- ensure private provider/server secrets are not exposed through `VITE_*` variables;
- rotate any credential if repository history exposed a sensitive secret;
- document required environment variables.

Important: never paste secret values into issues, PRs, logs or AI chat output.

### A3. Quality gates

Acceptance criteria:

- lint, typecheck, tests and build are executable locally;
- CI workflow is added only after local commands are reliable;
- new warnings/errors introduced by the sprint are not accepted silently.

## Workstream B — Product data model

Define the minimum persistent entities required for the first vertical slice.

Suggested conceptual entities (adapt to existing schema before creating anything):

- `profiles` / user identity metadata;
- `workspaces` if needed for agency/multi-client evolution;
- `businesses` or `brands` for reusable company context;
- `workflow_definitions` or code-defined workflow catalog;
- `workflow_runs` for execution/history;
- `workflow_outputs` if outputs need independent lifecycle;
- `usage_events` for AI/token/cost accounting.

Acceptance criteria:

- no duplicate entity is introduced if an equivalent already exists;
- user-owned/tenant-owned data has explicit RLS;
- migrations are deterministic and reviewable;
- identifiers and ownership model are documented.

## Workstream C — First workflow

Implement exactly one workflow before expanding the catalog.

Recommended first workflow: **Marketing Campaign Planner**.

### Input

Minimum useful fields:

- business/profile selection;
- campaign objective;
- product/service/offer;
- audience;
- channel(s);
- optional constraints/context.

Avoid long onboarding forms when data can be inferred from saved business context.

### Structured output

The first version should return a validated structure similar to:

- campaign objective summary;
- audience/message insight;
- central concept/big idea;
- offer angle;
- content/creative directions;
- channel execution plan;
- suggested calls to action;
- next actions.

Use a schema validator (Zod) before rendering/persisting model output.

### Acceptance criteria

- user can start from the UI;
- business context is included automatically when available;
- AI request happens through a defined service boundary, not directly inside a page/component;
- response is validated;
- failure state is understandable and retryable;
- successful result is persisted;
- history can reopen the result;
- usage/cost metadata has a defined measurement point.

## Workstream D — AI architecture

For Sprint 01, optimize for replaceability and observability without over-engineering.

Minimum boundary:

```text
UI/form
  -> application workflow service
  -> prompt/workflow builder
  -> AI provider adapter
  -> output schema validation
  -> persistence
```

Acceptance criteria:

- model/provider credentials are server-side when required;
- prompt text is not duplicated across UI files;
- provider response is normalized before business logic consumes it;
- model and token usage can be recorded when the provider exposes it;
- provider-specific details do not leak broadly through components.

Do not build multi-provider routing until a concrete need exists.

## Workstream E — UX vertical slice

Required screens/states for the first workflow:

1. auth/session state;
2. business/profile selection or creation;
3. workflow catalog/home with the first workflow highlighted;
4. guided workflow form;
5. loading/execution state;
6. structured result page;
7. generation history;
8. empty/error states.

Reuse shadcn/Radix components already installed before introducing a new UI library.

## Workstream F — Tests

Minimum coverage should target behavior that could regress:

- input schema validation;
- output schema validation;
- workflow builder/service mapping;
- critical UI flow where practical;
- authorization/RLS behavior for persistent user-owned data.

Do not chase arbitrary coverage percentage in Sprint 01.

## Suggested implementation sequence

1. Baseline audit and secret hygiene.
2. Inspect existing Supabase schema and current auth/data flow.
3. Confirm minimal domain model; create only required migration changes.
4. Define TypeScript/Zod schemas for the first workflow.
5. Implement AI service boundary and provider adapter.
6. Implement persistence for workflow run/output and usage metadata.
7. Build guided UI flow using existing design system.
8. Implement history/reopen flow.
9. Add regression tests.
10. Run security review and all quality gates.
11. Open a PR with screenshots, risks and validation evidence.

## Non-goals for this sprint

- billing integration;
- multiple AI providers;
- dozens of workflow templates;
- automated social posting;
- complex agent orchestration inside the customer-facing product;
- full agency team permissions;
- complete VPS production deployment automation.

## Definition of done

Sprint 01 is complete only when the first workflow works end-to-end with persisted history, the codebase passes agreed quality checks (or baseline exceptions are explicitly documented), and no known secret/security regression is introduced.
