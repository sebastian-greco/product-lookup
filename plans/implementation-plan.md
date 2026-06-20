# Product Lookup Service Implementation Plan

## Context

This repo is a greenfield backend service for product lookup. The goal is to build a maintainable REST API with clear contracts, database persistence, local development support, tests, and reviewable delivery steps.

The agreed delivery model is four phases. Each phase should land as its own draft PR, with focused commits per task so reviewers can inspect setup, schema, API behavior, and docs independently.

## Agreed technical decisions

- Runtime and API framework: Fastify 5
- Request and response contracts: TypeBox
- Database access: Drizzle ORM
- Database: Postgres through node-postgres
- IDs: prefixed ULID strings, for example `prd_01J9Y7Y7NQ7R4X1V5B3K8M6T9A`
- Product status: defaults to `ACTIVE`
- Error format: Problem Details style responses
- Pagination: `page` and `page_size`, with defaults, maximum page size, and totals
- Search: case insensitive name search using `ILIKE`, backed by `pg_trgm`
- Architecture: layer first, with no business logic in routes
- Local development: hybrid local dev, app runs locally while Postgres runs in Docker, with Docker support for full stack dev where useful
- Testing: integration first, selective unit tests
- Test tooling: Vitest plus Fastify inject
- Phase 1 includes CI, lint, and format setup
- Each phase is delivered as a draft PR
- Commits stay focused by task

## Likely repo structure

```text
.
├── plans/
│   ├── api-service-requirements.md
│   └── implementation-plan.md
├── src/
│   ├── app/
│   │   ├── build-app.ts
│   │   ├── register-plugins.ts
│   │   └── register-routes.ts
│   ├── config/
│   │   └── env.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema/
│   │   │   └── products.table.ts
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── errors/
│   │   ├── problem-details.ts
│   │   └── error-handler.ts
│   ├── ids/
│   │   └── product-id.ts
│   ├── routes/
│   │   ├── health.routes.ts
│   │   └── products.routes.ts
│   ├── schemas/
│   │   └── products.schemas.ts
│   ├── services/
│   │   └── products.service.ts
│   ├── repositories/
│   │   └── products.repository.ts
│   └── server.ts
├── test/
│   ├── helpers/
│   │   ├── app.ts
│   │   └── database.ts
│   ├── integration/
│   │   └── products.test.ts
│   └── unit/
│       └── product-id.test.ts
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── prettier.config.js
└── README.md
```

## Phase 1: Project foundation and developer workflow

### Goal

Create the service foundation so future work has consistent tooling, structure, validation, CI, and local developer commands.

### Scope

- Initialize the TypeScript Node project.
- Add Fastify 5.
- Add TypeBox for schema definitions.
- Add Vitest.
- Add lint and format tooling.
- Add CI for install, lint, typecheck, tests, and format check.
- Add basic app bootstrapping with health route.
- Add environment config handling.
- Add structured logging setup.
- Add initial README sections for setup, scripts, architecture shape, and phase status.
- Add Docker Compose for Postgres.
- Decide and document hybrid local dev:
  - Postgres runs in Docker.
  - App can run locally through npm scripts.
  - Optional full stack Docker path can be added once the app has database behavior.

### Likely deliverables

- `package.json` with scripts for dev, build, lint, format, typecheck, test, and test watch.
- `src/app/build-app.ts` exports a Fastify app factory for tests.
- `src/server.ts` starts the server.
- `src/config/env.ts` validates required config.
- `src/routes/health.routes.ts` exposes `GET /health`.
- `docker-compose.yml` starts Postgres for local dev.
- CI workflow runs lint, format check, typecheck, and tests.
- README includes first run instructions.
- `.gitignore` covers Node, build, env, local database, and editor artifacts.

### Testing strategy

- Add a Fastify inject integration test for `GET /health`.
- Add test helpers that create the app without opening a network port.
- Keep Phase 1 tests database free unless config loading needs a safe mock.

### PR boundary

Draft PR 1 should only cover project setup and the minimal health endpoint. It should not add product schema, migrations, product routes, or business behavior.

### Acceptance criteria

- `pnpm install` works.
- `pnpm lint` passes.
- `pnpm format:check` passes.
- `pnpm typecheck` passes.
- `pnpm test` passes.
- `pnpm build` passes.
- `GET /health` returns a healthy response through Fastify inject.
- README explains local setup and available scripts.
- CI runs the same checks as local development.

## Phase 2: Database schema, migrations, and data access

### Goal

Add durable product storage with Drizzle, Postgres, migrations, indexes, seed data, and a repository layer that hides database details from the service layer.

### Scope

- Add Drizzle with node-postgres.
- Add database client plugin.
- Define the products table.
- Add migrations.
- Add seed data for local development.
- Add prefixed ULID product ID generation.
- Add database constraints for product integrity.
- Add indexes for common lookups:
  - Unique SKU.
  - Product ID.
  - Category and status filters where useful.
  - `pg_trgm` support for name search.
- Add repository methods needed by later phases:
  - Create product.
  - Find product by ID.
  - List products with filters, pagination, and total count.
- Keep routes out of this phase except wiring needed for app startup.

### Product persistence expectations

Product records include:

- `id`
- `sku`
- `name`
- `description`
- `category`
- `price`
- `currency`
- `status`
- `created_at`
- `updated_at`

Rules:

- `id` is generated by the system as a prefixed ULID.
- `sku` is unique.
- `status` defaults to `ACTIVE`.
- `price` must be positive.
- `currency` stores ISO 4217 style values.
- `created_at` and `updated_at` are system managed.

### Testing strategy

- Add integration tests against the local test database.
- Test migration application in CI if practical.
- Test repository create and lookup behavior.
- Test uniqueness behavior for SKU.
- Add selective unit tests for ID generation because it has business visible formatting rules.

### PR boundary

Draft PR 2 should focus on persistence only. It should not expose the final product API yet, except for any harmless plumbing needed to keep the app bootable.

### Acceptance criteria

- Drizzle config is present.
- Migrations create the product schema successfully.
- Seed command creates useful local data.
- Repository tests pass against Postgres.
- Product IDs use the agreed `prd_` prefixed ULID format.
- New product records default to `ACTIVE`.
- `pg_trgm` is enabled for search support.
- README explains database setup, migrations, and seed usage.

## Phase 3: Product API behavior

### Goal

Expose the product REST API with validation, Problem Details errors, service layer rules, pagination, filtering, and search.

### Scope

- Add product route definitions under `/api/v1/products`.
- Add TypeBox schemas for request params, query strings, request bodies, and responses.
- Add service layer for product use cases.
- Keep routes thin:
  - Validate input.
  - Call service methods.
  - Return typed responses.
  - No business logic in route handlers.
- Implement:
  - `POST /api/v1/products`
  - `GET /api/v1/products/:id`
  - `GET /api/v1/products`
- Add Problem Details error handling.
- Add pagination behavior:
  - `page`
  - `page_size`
  - default values
  - maximum page size
  - `total_items`
  - `total_pages`
- Add filters:
  - `category`
  - `status`
  - `search`
- Use `ILIKE` for case insensitive product name search, backed by the `pg_trgm` index from Phase 2.
- Return appropriate HTTP status codes:
  - `201` for create.
  - `200` for successful reads.
  - `400` for invalid input.
  - `404` for missing product.
  - `409` for duplicate SKU.
  - `500` for unexpected failures through a safe Problem Details response.

### Testing strategy

- Add integration tests using Vitest and Fastify inject.
- Cover successful product creation.
- Cover default status behavior through API responses.
- Cover get by ID.
- Cover not found behavior.
- Cover duplicate SKU conflict.
- Cover validation failures and Problem Details response shape.
- Cover list pagination defaults and maximum page size.
- Cover pagination totals.
- Cover category and status filters.
- Cover case insensitive search by product name.
- Add selective unit tests for service level mapping where integration tests would be too broad.

### PR boundary

Draft PR 3 should focus on API behavior. It should not add full OpenAPI polish, production Docker improvements, or broad documentation beyond what is needed to understand the API behavior.

### Acceptance criteria

- All product endpoints work through Fastify inject tests.
- TypeBox schemas define public request and response contracts.
- Route files contain no business logic.
- Service layer owns use cases and error mapping.
- Repository layer owns database queries.
- Errors follow Problem Details shape consistently.
- Pagination returns defaults, max limited page size, and totals.
- Search is case insensitive with `ILIKE`.
- README includes basic API examples for create, get, list, filter, and search.

## Phase 4: Documentation, OpenAPI, local polish, and final readiness

### Goal

Make the service reviewable and easy to run, with complete docs, OpenAPI, Docker support, and final readiness checks.

### Scope

- Add or finish OpenAPI documentation through Fastify Swagger tooling.
- Add Swagger UI or a documented OpenAPI JSON endpoint.
- Improve README with:
  - Architecture and design decisions.
  - How to run locally.
  - How to run tests.
  - Database schema.
  - Migration and seed commands.
  - API examples.
  - Pagination strategy.
  - Error format.
  - Tradeoffs and assumptions.
  - What should improve before production.
- Add full stack Docker path if not already complete:
  - App container.
  - Postgres container.
  - Migration or seed instructions.
- Review logging, config, and startup failure behavior.
- Add final test coverage for documented examples where practical.
- Tighten CI if gaps remain.
- Confirm every endpoint and script documented in README actually works.

### Testing strategy

- Run full test suite.
- Run lint, format check, typecheck, and build.
- Validate OpenAPI generation starts without runtime errors.
- Smoke test local Docker workflow.
- Confirm README commands are accurate.
- Add tests for any final behavior added in this phase, such as OpenAPI endpoint availability.

### PR boundary

Draft PR 4 should only cover docs, OpenAPI, local run polish, and final readiness. It should not introduce new product features or change API behavior unless needed to fix a discovered gap.

### Acceptance criteria

- OpenAPI docs are available and match implemented endpoints.
- README is complete and accurate.
- Local development path works from a fresh checkout.
- Docker based Postgres path works.
- Full stack Docker path is documented if included.
- Migrations and seed data are documented and tested manually.
- CI passes.
- Lint, format check, typecheck, tests, and build pass locally.
- Final docs clearly state tradeoffs and production follow ups.

## Cross phase engineering rules

### Architecture

Use a layer first design:

- Routes handle HTTP concerns only.
- Schemas define contracts.
- Services handle use cases and business decisions.
- Repositories handle database access.
- Shared error helpers map domain failures to Problem Details.
- Database schema and migrations stay under `src/db` or a clearly named database folder.

No business logic belongs in routes.

### Testing approach

Prefer integration tests for behavior that crosses HTTP, validation, service, and repository boundaries. Use unit tests only where they add clear value, such as ID generation, pagination calculations, or small pure mapping functions.

Primary tools:

- Vitest
- Fastify inject
- Postgres test database
- Drizzle migrations

### Commit and PR approach

Each phase gets one draft PR. Within each PR, commits should be focused by task, for example:

- Project tooling setup.
- App factory and health route.
- Database schema and migrations.
- Repository methods.
- Product route schemas.
- Product API integration tests.
- README updates.

Avoid mixing unrelated changes in the same commit.

### Documentation expectations

Documentation should grow each phase rather than wait until the end. Every phase should update README or planning docs when it changes how the service is run, tested, structured, or reviewed.
