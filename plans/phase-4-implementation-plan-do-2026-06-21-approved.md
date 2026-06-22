# Phase 4 Implementation Plan: Docs, OpenAPI, Local Polish, Final Readiness

## Phase Boundary

Phase 4 should finish the service as a documented, locally runnable backend without changing product behavior. The branch already has working product routes, Problem Details handling, repository/db layers, `.env` loading, Docker app+db flow, and integration tests. This phase should add OpenAPI/docs surfaces, improve route documentation metadata, complete README/final docs, and add manual smoke verification around the generated docs.

Do not add new product endpoints, new filters, auth, sorting, admin behavior, production deployment automation, external services, or schema/data model changes unless they are strictly required to document existing behavior.

## Current Repo Anchors

Use the current structure rather than introducing a new architecture pattern:

- App setup: `src/app/build-app.ts`
- Route registration: `src/app/register-routes.ts`
- Product routes: `src/routes/products.routes.ts`
- Health route: `src/routes/health.routes.ts`
- Product schemas: `src/schemas/products.schemas.ts`
- Problem schemas: `src/schemas/problem-details.schemas.ts`
- Test app helper: `test/helpers/build-test-app.ts`
- Route tests: `test/integration/products.routes.test.ts`, `test/integration/health.test.ts`
- README: `README.md`
- CI: `.github/workflows/ci.yml`
- Docker dev flow: `docker-compose.yml`, `.env.example`

## Execution Sequence

1. Add OpenAPI dependencies and plugin wiring.

Add runtime dependencies:

- `@fastify/swagger`
- `@fastify/swagger-ui`

Wire them through a small app-layer module rather than crowding `build-app.ts`. A practical shape:

- Create `src/app/documentation-plugin.ts` or `src/app/openapi-plugin.ts`.
- Export a `documentationPlugin` Fastify plugin.
- Register `@fastify/swagger` inside it with OpenAPI metadata.
- Register `@fastify/swagger-ui` inside it with `routePrefix: '/documentation'`.
- Keep TypeBox route schemas as the source of truth.

Register this plugin in `src/app/build-app.ts` after core plugins and before `registerRoutes` so `@fastify/swagger` observes all subsequently registered route schemas.

Recommended order in `build-app.ts`:

```ts
app.register(databasePlugin, { connectionString: config.databaseUrl });
app.register(problemDetailsPlugin);
app.register(documentationPlugin);
app.register(registerRoutes);
```

`@fastify/swagger` must be registered before `registerRoutes`. `@fastify/swagger-ui` can live in the same documentation plugin after the swagger registration, while the UI still renders the generated document after app readiness.

Recommended OpenAPI metadata:

- `info.title`: `Product Lookup API`
- `info.version`: match `package.json` version if simple to import safely, otherwise use the current package version string `0.1.0` explicitly to avoid runtime JSON import friction.
- `info.description`: concise description of the existing product lookup backend.
- `tags`: `health` and `products`.
- No security schemes yet unless auth exists.
- No fake servers unless the team wants local examples; if included, keep it local only, e.g. `http://127.0.0.1:3000`.

Do not make docs availability environment-dependent in Phase 4 unless the user explicitly wants it. A stable docs route is useful for local/Docker smoke checks.

2. Polish route metadata without changing handlers.

Update existing route `schema` objects only. Avoid moving business logic.

For `src/routes/health.routes.ts`:

- Keep existing `tags: ['health']`.
- Add `summary`, `description`, and `operationId`, e.g. `getHealth`.

For `src/routes/products.routes.ts`:

- Add `tags: ['products']` to all product operations.
- Add stable `operationId` values, e.g. `createProduct`, `getProductById`, `listProducts`.
- Add concise `summary` and `description` per operation.
- Keep response status codes exactly aligned with current behavior.
- Do not add undocumented response codes just because they are theoretically possible.

Suggested operation descriptions:

- `POST /api/v1/products`: create a product with a unique SKU.
- `GET /api/v1/products/{id}`: fetch one product by prefixed product ID.
- `GET /api/v1/products`: list products with page/page_size pagination and existing category/status/search filters.

3. Polish TypeBox schemas for generated docs.

Keep `src/schemas/products.schemas.ts` as the contract source of truth. Add metadata that improves generated docs while preserving validation behavior:

- Field `description` values for product IDs, SKU, name, description, category, price, currency, status, timestamps, pagination fields, and query filters.
- `examples` where supported by the schema generator, especially for IDs, SKU, price, currency, status, and date-time strings.
- Consider `title` metadata for major schemas only if it improves OpenAPI readability without creating clutter.
- Add `description` to `productStatusSchema` if feasible.
- Keep defaults and max pagination values as they are: `page` default `1`, `page_size` default `20`, max `100`.

Update `src/schemas/problem-details.schemas.ts` similarly:

- Add descriptions for `type`, `title`, `status`, `detail`, `instance`, and validation `errors` fields.
- Include examples that match current Problem Details behavior.
- Do not change the response shape.

If schemas get noisy, prefer minimal descriptions on public fields over exhaustive examples everywhere.

4. Verify docs behavior with manual smoke checks and existing project checks.

Do not create new automated docs tests in this phase.

Use manual checks after implementation to verify:

- `GET /documentation` returns Swagger UI HTML.
- `GET /documentation/json` returns a generated OpenAPI JSON document.
- The OpenAPI document includes `/health`, `/api/v1/products`, and `/api/v1/products/{id}`.
- Product operations show stable operation IDs and expected methods.
- The product list operation documents `page`, `page_size`, `category`, `status`, and `search`.
- Existing response status codes are visible for implemented success and Problem Details responses.

Keep verification practical: inspect the generated docs surface and run the existing project checks; do not snapshot or commit generated OpenAPI output.

5. Complete README final-readiness documentation.

Update `README.md` from Phase 3 language to final Phase 4 language.

Required sections to complete or add:

- Overview: describe the service as a Fastify product lookup API, not a scaffold.
- Stack: keep current stack and add OpenAPI/Swagger docs dependencies once wired.
- Quick start with Docker: include `docker compose up --build`, app URL, health URL, docs URL, and seeded product behavior.
- Host-run local setup: include `pnpm install`, `docker compose up -d postgres`, `pnpm db:setup`, `pnpm dev`.
- Environment variables: keep current variables and clarify host vs Docker `DATABASE_URL` behavior.
- API documentation: document `/documentation` and `/documentation/json`.
- API examples: include practical `curl` examples for health, list products, create product, get product by ID, validation error, and duplicate SKU error.
- Pagination and search: document `page`, `page_size`, `category`, `status`, `search`, defaults, max page size, and total metadata.
- Error format: document RFC 9457-style Problem Details and validation `errors` array.
- Database schema and migrations: summarize `products` table purpose, IDs, unique SKU, useful indexes, committed Drizzle migrations, and deterministic seed workflow.
- Architecture: explain route/service/repository/db/schema/error layers using current paths.
- Testing: explain integration-first approach, local prerequisites, and project checks.
- CI: list existing check sequence and note manual docs smoke checks.
- Design decisions and tradeoffs: TypeBox as contract source, Drizzle with `pg`, simple PostgreSQL `ILIKE` search first, Docker dev reset/seed behavior, no auth yet.
- Production follow-ups: auth/authorization if needed, production logging/observability, deployment config, rate limiting, API versioning policy, migration rollout process, secret management, backups, readiness/liveness split if needed.
- Scope status: mark Phase 4 docs/OpenAPI/final readiness done and note intentionally deferred items.

Keep the README practical. Do not turn it into a large product spec.

6. Add useful local/Docker polish only if directly tied to docs/readiness.

Worth doing in Phase 4 if small:

- Update README Docker smoke commands to include `/documentation` and `/documentation/json`.
- Leave the Docker `app` healthcheck focused on `/health`; docs availability should be a manual smoke check, not the container health signal.
- Optionally rename the CI job from `phase-1-checks` to a neutral name like `checks`. This is documentation/readiness polish, but do it as a separate commit because it touches CI semantics.

Avoid changes that make local development more complex.

7. Run final verification.

Before marking Phase 4 done, run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If dependencies or generated lockfile changes occur, also verify:

```bash
pnpm install --frozen-lockfile
```

Manual smoke checks after `docker compose up --build`:

```bash
curl -i http://127.0.0.1:3000/health
curl -i http://127.0.0.1:3000/documentation
curl -i http://127.0.0.1:3000/documentation/json
curl -i 'http://127.0.0.1:3000/api/v1/products?page=1&page_size=2'
```

## Recommended Atomic Commit Strategy

Commit 1: `feat: expose openapi documentation`

- Add `@fastify/swagger` and `@fastify/swagger-ui` dependencies.
- Add `src/app/documentation-plugin.ts` or `src/app/openapi-plugin.ts`.
- Register the documentation plugin before route registration in `src/app/build-app.ts`.
- Manually verify `/documentation` and `/documentation/json` are reachable.

Commit 2: `docs(api): add route metadata to openapi schemas`

- Add `tags`, `summary`, `description`, and `operationId` to health/product route schemas.
- Add TypeBox field descriptions/examples to product and Problem Details schemas.
- Manually inspect generated OpenAPI JSON/UI for the current route contract.

Commit 3: `docs: complete local api documentation`

- Update `README.md` with final Phase 4 sections: quick start, docs URLs, API examples, pagination, errors, architecture, database, CI, tradeoffs, production follow-ups.
- Keep wording aligned with current implemented behavior only.

Commit 4: `ci: use neutral checks job name` optional

- Rename `.github/workflows/ci.yml` job from `phase-1-checks` to `checks` if desired.
- Do not alter the core check sequence; `pnpm test` remains the existing automated verification path.

Commit 5: `chore: verify phase 4 readiness` only if there is an actual committed readiness change

- Use this only for small final polish that does not belong elsewhere, such as README command correction discovered during smoke checks.
- Do not create an empty or ceremonial commit.

## Execution Discipline for Ultrawork

Work in small, reviewable increments while respecting the request not to add new docs tests:

- Baseline: run the existing checks relevant to the files being touched before broad changes if there is uncertainty.
- Implement: wire Swagger/OpenAPI with the smallest app-layer plugin and manually verify the docs endpoints.
- Polish: add route metadata and schema descriptions, then inspect the generated docs for accuracy.
- Document: update README after behavior is implemented so examples are accurate.
- Verify: run the full project checks and Docker smoke checks before final review.

Keep each commit independently reviewable. Do not mix dependency installation, route metadata polish, README rewrites, and CI cleanup in one commit.

## Scope Traps To Avoid

- Do not add auth, API keys, security schemes, or fake bearer auth in OpenAPI.
- Do not add product update/delete endpoints.
- Do not add sorting, new filters, facets, categories endpoints, or fuzzy search behavior.
- Do not change pagination semantics.
- Do not change Product ID format or seed data unless manual docs verification exposes a real inconsistency.
- Do not introduce generated OpenAPI files committed to the repo unless explicitly requested.
- Do not split schemas into a new framework-like docs layer; TypeBox route schemas stay the source of truth.
- Do not make Swagger UI conditional on production without a clear requirement.
- Do not use Docker healthchecks for broad API validation; keep container health focused on `/health`.
- Do not add deployment, observability, tracing, rate limiting, or background jobs in Phase 4.
- Do not document behavior that does not exist yet.

## Definition Of Done

Phase 4 is done when:

- `/documentation` serves Swagger UI.
- `/documentation/json` serves the generated OpenAPI document.
- Generated docs include the current health and product routes with useful operation metadata.
- Product and Problem Details schemas are clear enough for API consumers.
- Manual smoke checks verify the docs endpoints and stable OpenAPI route contract.
- README describes local/Docker setup, API docs, endpoint examples, pagination, errors, database/migration/seed workflow, architecture, CI, tradeoffs, and production follow-ups.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- Docker manual smoke checks pass for health, docs UI, docs JSON, and a product list request.
