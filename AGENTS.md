# AGENTS.md

## Project Context

This repo is a greenfield backend service built with:

* Fastify 5
* TypeBox for runtime schemas and static types
* Drizzle ORM
* PostgreSQL via `node-postgres`
* pnpm
* Node.js LTS

The current repo is intentionally minimal. Future agents and contributors should treat this file as the source of truth for engineering expectations until more specific docs exist.

## Core Engineering Principles

Build the service as a maintainable backend, not a collection of route handlers.

Follow these rules:

* Keep business logic out of Fastify routes.
* Keep data access behind repository or persistence modules.
* Keep validation schemas close to the feature they describe.
* Prefer explicit modules over generic shared dumping grounds.
* Write code that is easy to test without booting the whole app.
* Make changes in small, focused commits.
* Keep files and functions small enough to understand quickly.
* Avoid clever abstractions until duplication proves they are needed.

## Runtime and Tooling

Use:

* Node.js LTS
* pnpm
* Fastify 5
* TypeBox
* Drizzle
* PostgreSQL through `node-postgres`

Do not introduce another HTTP framework, ORM, schema library, package manager, or database client unless the project owner explicitly changes the decision.

Phase 1 must include CI, linting, formatting, and test commands. Every later phase must keep those checks passing.

## Architecture

Use a layer-first structure. A practical default is:

```text
src/
  app/
    server setup, plugin registration, config loading
  routes/
    Fastify route registration only
  schemas/
    TypeBox request and response contracts
  services/
    business use cases and orchestration
  repositories/
    persistence access only
  db/
    Drizzle schema, migrations, client setup
  errors/
    Problem Details helpers and error mapping
  ids/
    entity identifier helpers
test/
  helpers/
    shared test helpers
  integration/
    integration test suites
  unit/
    focused unit test suites
```

Within each layer, keep domain files explicit and grouped by name. For example:

```text
routes/
  products.routes.ts
schemas/
  products.schemas.ts
services/
  products.service.ts
repositories/
  products.repository.ts
ids/
  product-id.ts
```

Routes may:

* Register endpoints
* Attach TypeBox schemas
* Read request input
* Call services
* Return responses

Routes must not:

* Contain business rules
* Build SQL directly
* Know Drizzle table details
* Perform multi-step workflows inline
* Contain large conditional branches

Services should hold business behavior. Repositories should hold database access. Shared helpers should be specific and named for their purpose.

## Database Rules

Use Drizzle for schema and queries. PostgreSQL is the source of truth for persistence behavior.

Use `node-postgres` as the PostgreSQL driver.

Database IDs should use prefixed ULIDs, for example:

```text
usr_01J...
prd_01J...
```

ID prefixes should be short, stable, and documented near the entity definition.

Migrations must be committed. Do not rely on manual database changes.

Prefer explicit database constraints for important invariants. Application validation is not a replacement for database integrity.

## API Rules

Use JSON APIs.

Errors must use Problem Details style responses. Use a consistent shape based on RFC 9457:

```json
{
  "type": "https://example.com/problems/invalid-request",
  "title": "Invalid request",
  "status": 400,
  "detail": "The request body is invalid.",
  "instance": "/products"
}
```

Do not return raw internal errors to clients.

## Pagination

List endpoints must use:

* `page`
* `page_size`

Rules:

* Provide a default `page`.
* Provide a default `page_size`.
* Enforce a maximum `page_size`.
* Return total counts when listing resources.
* Keep pagination response shapes consistent across endpoints.

A typical response should include items plus pagination metadata.

## Search

Use simple PostgreSQL search first.

For case-insensitive substring search, use `ILIKE`.

`pg_trgm` is allowed when needed for indexed fuzzy or partial matching. Add it deliberately, document why it is needed, and cover the behavior with integration tests.

Do not introduce an external search service unless explicitly approved.

## Validation and Schemas

Use TypeBox for request and response schemas.

Schemas should be close to the route or feature they support. Reuse schemas when the same contract is truly shared.

Avoid broad catch-all schemas. Be precise about required fields, optional fields, formats, and response bodies.

Keep runtime validation and TypeScript types aligned through TypeBox.

## Testing Standards

Use integration-first testing.

Most important behavior should be tested through the real app stack with a real PostgreSQL database or a faithful local test database.

Integration tests should cover:

* Route behavior
* Validation failures
* Problem Details error responses
* Database reads and writes
* Pagination metadata
* Search behavior
* Important business rules

Use unit tests selectively for:

* Pure business logic
* Complex calculations
* Error mapping
* Small utilities with meaningful edge cases

Do not overuse unit tests for code that is better verified through an integration path.

Code should be designed so tests can inject dependencies where needed. Avoid hidden globals that make tests order-dependent.

## Local Development

Use a hybrid local development model.

The service should be runnable locally with local configuration, while database-backed behavior should be easy to test against a local or disposable PostgreSQL instance.

Do not require contributors to use one specific global machine setup when a project script or documented command can make the workflow repeatable.

Keep local setup practical. Prefer clear scripts and documented environment variables.

## Delivery Workflow

Work in phases.

Each phase should produce a draft PR. Keep the PR reviewable and focused.

Use focused commits per task. A commit should have one clear purpose.

Do not bundle unrelated work into one commit. Do not hide cleanup inside feature commits unless the cleanup is required for that feature.

Before marking a phase done, run the project checks:

* Format
* Lint
* Typecheck
* Tests
* Build, when applicable

If a check is not available yet, add it in phase 1 or explain why it does not apply.

## Maintainability Guardrails

These are guardrails, not oppressive style rules.

Avoid monolithic files. If a file is getting hard to scan, split it by responsibility.

Avoid huge functions. If a function mixes validation, database access, business decisions, and response shaping, split it.

Avoid generic dumping-ground modules such as:

```text
utils.ts
helpers.ts
common.ts
misc.ts
```

Prefer names that explain purpose:

```text
pagination.ts
problem-details.ts
ulid.ts
products.repository.ts
```

Keep abstractions honest. Do not create framework-like layers before the project needs them.

Prefer duplication over premature abstraction when the shared concept is not clear yet.

## File and Function Size Guidance

Use judgment, but follow these signals:

* A route file with many unrelated endpoints should be split.
* A function that needs section comments is probably doing too much.
* A module that changes for many unrelated reasons should be split.
* A helper imported everywhere should be reviewed carefully.
* A service that directly knows HTTP details should be refactored.

Small, clear files are better than large files with hidden coupling.

Target guardrails:

* File size target: around 300 lines
* Function size target: around 40 lines
* Parameter count target: ideally 4 or fewer
* Avoid deep nesting and heavily branched functions when extraction would improve readability

These are review targets, not absolute limits. Reviewer discretion applies, but clarity must still be obvious.

## Error Handling

Centralize error mapping.

Services and repositories may throw known application errors. Fastify error handling should translate them into Problem Details responses.

Unexpected errors should become safe 500 responses with no leaked internals.

Validation errors should be consistent and useful.

## Configuration

Configuration should be explicit, typed, and validated at startup.

Do not read environment variables throughout the codebase. Load them in one place, validate them, then pass typed config into the app.

Keep secrets out of git.

## Dependency Rules

Add dependencies only when they clearly solve a project problem.

Before adding a package, consider:

* Is this already solved by Fastify, TypeBox, Drizzle, PostgreSQL, or Node.js?
* Is the package maintained?
* Will this make testing harder?
* Does it create a new architecture pattern?

Avoid dependency churn.

## Agent Behavior

When working in this repo:

* Read existing docs before implementing.
* Follow this file unless a more specific repo doc overrides it.
* Keep changes scoped to the task.
* Do not add implementation code when asked for planning or documentation only.
* Do not invent requirements beyond the agreed decisions.
* Prefer practical, readable solutions.
* Verify work before reporting it as done.

If requirements conflict, follow the most recent explicit user instruction and note the conflict clearly.
