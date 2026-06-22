# Phase 2 Database And Domain Implementation Plan

## Scope Boundary

This plan covers Phase 2 only on branch `phase-2-database-domain`.

Phase 2 includes Drizzle/Postgres foundation, product persistence/domain primitives, deterministic seed support, and Postgres-backed tests.

Phase 2 does not include product HTTP routes, API request/response schemas, Fastify route handlers, pagination API behavior, or public search endpoints. Those belong to Phase 3.

## Execution Principles

- Work in small green commits. For each logical unit, write the test or verification first, implement the smallest code needed, run the checkpoint, then commit.
- Keep the app bootable without accidentally requiring a database for unrelated health tests unless the existing app wiring already guarantees a test database.
- Keep database access behind `src/db` and `src/repositories`; do not let route files know Drizzle table details.
- Use one `pg.Pool` per process/app instance and close it from Fastify lifecycle or test teardown.
- Commit generated migrations and Drizzle metadata together with the schema change that produced them.
- Prefer deterministic fixtures and explicit cleanup over test order assumptions.

## Recommended Atomic Commit Strategy

| Commit | Theme | Contents | Green Checkpoint |
| --- | --- | --- | --- |
| 1 | Database tooling | Add dependencies, Drizzle config, DB env docs, scripts, migration folder convention | Existing format/lint/typecheck/tests/build still pass |
| 2 | Product schema migration | Add `src/db/schema`, `pg_trgm` bootstrap migration, products table, constraints, indexes, generated migration metadata | Migration applies cleanly to a disposable Postgres DB |
| 3 | DB client wiring | Add `pg` pool factory, Drizzle client factory, Fastify plugin/lifecycle wiring, test helpers for DB lifecycle | Unit/plugin tests plus existing checks pass |
| 4 | Product ID utility | Add prefixed ULID generator/parser/validator under `src/ids` with unit tests | ID unit tests plus typecheck pass |
| 5 | Product repository | Add repository methods and Postgres integration tests for create/find/list | Integration tests against Postgres pass |
| 6 | Seed and docs | Add deterministic seed workflow, safe reset/cleanup support, README updates | Seed can run twice safely and all checks pass |

If any commit becomes large, split only at a green boundary. Do not create separate commits that contain only failing tests unless the branch workflow explicitly allows red commits.

## Commit 1: Database Dependencies, Config, And Scripts

Add runtime dependencies first:

- `pg`
- `drizzle-orm`
- `ulid`

Add dev dependencies first:

- `drizzle-kit`
- `drizzle-seed`, if deterministic fixture generation is desired instead of a tiny custom seed script
- `@types/pg`
- `tsx`, only if the repo does not already have a TypeScript script runner

Add Drizzle config:

- Create `drizzle.config.ts` at repo root.
- Use `dialect: "postgresql"`.
- Use `schema: "./src/db/schema/index.ts"`.
- Use `out: "./drizzle"` or the repo-standard migrations directory if already documented.
- Read the migration target from `DATABASE_URL`.
- Do not import the app config module if that would force unrelated env validation during Drizzle CLI usage.

Add package scripts:

- `db:generate`: runs `drizzle-kit generate`.
- `db:generate:custom`: runs `drizzle-kit generate --custom` or documents the exact custom migration invocation.
- `db:migrate`: runs `drizzle-kit migrate` against `DATABASE_URL`.
- `db:seed`: runs the deterministic seed script.
- `test:integration`: runs the existing integration test command with Postgres requirements documented, if not already present.

Update config docs only enough for Phase 2:

- `DATABASE_URL` for local migrations and local app DB access.
- `TEST_DATABASE_URL` for integration tests.
- State that `TEST_DATABASE_URL` must point at a disposable database.

TDD checkpoint:

- No product tests yet.
- Run existing checks to prove tooling additions did not break the Phase 1 scaffold.

Validation commands:

```bash
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Commit 2: Product Schema, Constraints, Indexes, And Migrations

Create explicit schema organization:

- `src/db/schema/index.ts`
- `src/db/schema/products.ts`

Model only the Phase 2 product persistence fields from the local requirements. If the docs do not define every field, keep the table minimal and useful:

- `id` using prefixed product ID strings.
- `sku` as a required unique business identifier.
- `name` or required display/search text, if required by docs.
- `category` for category filters.
- `status` using the documented statuses.
- `created_at` and `updated_at` timestamps if Phase 2 docs require audit fields.

Add database invariants:

- Primary key on `id`.
- Unique constraint or unique index on `sku`.
- Not-null constraints for required fields.
- Status constraint or Postgres enum using only documented statuses.
- Product ID prefix check if practical in Drizzle or custom SQL.
- Useful btree indexes for category/status filters.
- Trigram index for text search fields that Phase 2 explicitly wants to prepare for `ILIKE` search.

Stage migrations in this order:

1. Generate a custom migration named like `enable_pg_trgm`.
2. Add `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in that migration.
3. Add the products schema in TypeScript.
4. Run `db:generate` for the products table migration.
5. If Drizzle cannot express the trigram operator class cleanly, add the trigram index as explicit SQL in the generated migration after `pg_trgm` is enabled.
6. Commit schema files, SQL migrations, and Drizzle migration metadata together.

TDD checkpoint:

- Treat migration application as the first test for this unit.
- Do not add repository code yet.

Validation commands:

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
pnpm typecheck
pnpm lint
```

Optional verification query against the disposable DB:

```sql
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
SELECT table_name FROM information_schema.tables WHERE table_name = 'products';
SELECT indexname FROM pg_indexes WHERE tablename = 'products';
```

## Commit 3: Database Client And Fastify Plugin Wiring

Add DB client modules under `src/db`:

- `src/db/client.ts` for `pg.Pool` creation and `drizzle(pool, { schema })` creation.
- `src/db/plugin.ts` or `src/db/database-plugin.ts` for Fastify decoration and lifecycle closure.
- `src/db/types.ts` only if needed to keep types readable.

Keep lifecycle rules explicit:

- Create one pool for the app instance.
- Reuse that pool for the Drizzle client.
- Close the pool on Fastify close.
- Allow tests to inject a DB client or test database URL if the existing app helper supports dependency injection.
- Avoid making simple health-route tests require Postgres unless the app already starts every integration test with Postgres.

Add TypeScript module augmentation only if the Fastify instance is decorated with `db`.

TDD checkpoint:

- Add a small unit or integration-style lifecycle test before implementation.
- Test that closing the app closes the pool or calls the injected close function.
- Test that client construction uses the provided connection string and does not read scattered env vars.

Validation commands:

```bash
pnpm test
pnpm typecheck
pnpm lint
```

## Commit 4: Prefixed Product ULID Utility

Add product ID helpers under `src/ids`:

- `src/ids/product-id.ts`

Recommended API:

- `createProductId()` returns `prd_` plus a ULID.
- `isProductId(value)` validates prefix and ULID shape.
- `parseProductId(value)` or `assertProductId(value)` returns a typed value or throws a known validation/domain error if Phase 2 introduces error helpers.

Keep the utility small:

- Do not create a generic ID framework yet.
- Do not add prefixes for entities that do not exist in Phase 2.
- If tests need determinism, inject the ULID value/factory internally rather than weakening production behavior.

TDD checkpoint:

- Write unit tests first for prefix, shape, rejection of bad prefixes, rejection of malformed ULIDs, and stability of documented length.

Validation commands:

```bash
pnpm test -- product-id
pnpm typecheck
pnpm lint
```

## Commit 5: Product Repository And Postgres Integration Tests

Add repository module:

- `src/repositories/products.repository.ts`

Recommended repository methods for Phase 2:

- `createProduct(input)` inserts a product and returns the persisted row/domain record.
- `findProductById(id)` returns one product or `null`.
- `findProductBySku(sku)` returns one product or `null`, if SKU lookup is in Phase 2 docs.
- `listProducts(filters)` supports only Phase 2 persistence-level filters, such as category/status and simple search preparation.

Keep repository boundaries clean:

- Accept a Drizzle DB instance in the repository constructor/factory.
- Do not import Fastify from the repository.
- Do not parse HTTP query shapes in the repository.
- Do not return raw internal database errors as user-facing errors.
- Map unique constraint failures only if Phase 2 includes domain errors; otherwise test the database constraint and leave API error mapping to Phase 3.

Add integration test helpers:

- Use `TEST_DATABASE_URL` only.
- Fail fast with a clear skip/error if `TEST_DATABASE_URL` is missing, depending on existing test conventions.
- Run migrations before repository integration tests.
- Reset tables between tests with explicit cleanup such as `TRUNCATE products RESTART IDENTITY CASCADE`.
- Keep DB tests serial if using one shared test database.
- Close the pool after the test suite.

Repository tests first:

- Creating a product persists required fields.
- Duplicate SKU is rejected by Postgres.
- Duplicate product ID is rejected by Postgres.
- `findProductById` returns the row and returns `null` for a missing ID.
- `findProductBySku` returns the row and returns `null` for a missing SKU, if included.
- `listProducts` returns deterministic ordering.
- `listProducts` filters by category/status if included.
- Simple search behavior uses `ILIKE` if Phase 2 docs require search preparation.

Validation commands:

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test:integration
pnpm test
pnpm typecheck
pnpm lint
```

## Commit 6: Deterministic Seed And README Updates

Add seed support under `src/db`:

- `src/db/seed.ts`
- Optional fixture file under `src/db/fixtures` only if the fixture set is large enough to justify it.

Seed behavior:

- Use deterministic IDs and SKUs.
- Be safe to run repeatedly against local/dev/test databases.
- Prefer upsert or truncate-and-insert only when clearly guarded for disposable databases.
- Never run destructive seed cleanup against production without an explicit opt-in guard.
- Keep seed data small and targeted to repository/integration test development needs.

If using `drizzle-seed`:

- Confirm the installed `drizzle-orm` version satisfies the `drizzle-seed` requirement.
- Keep deterministic seeds stable so integration assertions do not become flaky.

README updates:

- Document how to start local Postgres with the existing `docker-compose`.
- Document `DATABASE_URL` and `TEST_DATABASE_URL`.
- Document migration generation and application flow.
- Document seeding.
- Document integration test expectations and cleanup behavior.

Validation commands:

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:seed
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:seed
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test:integration
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Ultrawork Execution Loop

Use this loop for each commit:

1. Confirm the worktree and current branch.
2. Read the exact docs section for the current slice.
3. Write the smallest failing test or migration verification for the slice.
4. Implement only the code needed for that slice.
5. Run the slice checkpoint.
6. Run broader checks if the slice touched shared config, app startup, or package scripts.
7. Inspect `git diff` for accidental Phase 3/API work.
8. Commit with a focused message.
9. Move to the next slice only when green.

Suggested commit messages:

- `Add Drizzle Postgres tooling`
- `Add product database schema migrations`
- `Wire database client lifecycle`
- `Add prefixed product IDs`
- `Add product repository persistence`
- `Add deterministic database seed workflow`

## Architecture Traps To Avoid

- Do not add product HTTP routes, controllers, request schemas, pagination response shapes, or API search endpoints in Phase 2.
- Do not put SQL or Drizzle table imports in route files.
- Do not require `DATABASE_URL` merely to import modules used by health tests.
- Do not create a generic repository framework, generic ID framework, or broad `utils.ts` module.
- Do not skip committing migrations or Drizzle metadata.
- Do not create trigram indexes before `pg_trgm` is enabled.
- Do not rely on manually edited databases that are not represented by migrations.
- Do not make tests depend on shared local database state.
- Do not leave pools open after tests; that will cause hanging test processes.
- Do not add broad seed data that turns into product requirements.
- Do not add external search infrastructure; Phase 2 is Postgres-only.
- Do not map every database error into API Problem Details yet unless local Phase 2 docs explicitly require the error layer now.

## Scope Traps To Avoid

- Avoid Phase 3 API behavior, even if repository methods make it tempting.
- Avoid full pagination implementation; repository ordering/filtering is enough unless docs explicitly require persistence-level pagination now.
- Avoid overdesigning services. Add a product service only if the Phase 2 docs require domain orchestration beyond simple repository access.
- Avoid adding unused directories just to match the future architecture. Create `src/services`, `src/schemas`, or `src/errors` only when a concrete Phase 2 file belongs there.
- Avoid adding auth, tenants, background jobs, caching, OpenAPI, or admin tooling.

## Final Phase 2 Definition Of Done

Phase 2 is complete when:

- Drizzle and `pg` are installed and configured.
- Migrations create `pg_trgm` support and the products table with documented constraints and indexes.
- A database client/plugin exists with clean lifecycle handling.
- Product IDs use the documented `prd_` ULID format and have unit coverage.
- Product repository create/find/list behavior is covered by Postgres integration tests.
- Deterministic seed support exists and is documented.
- README explains local DB, migrations, seed, and integration test workflow.
- Format, lint, typecheck, tests, integration tests, and build pass.
- No Phase 3 route/API work has been introduced.

---

# Plan Feedback

I've reviewed this plan and have 2 pieces of feedback:

## 1. (line 17) Feedback on: "Commit generated migrations and Drizzle metadata together with the schema change that produced them."
> this should be a rule, add it to the agents.md

## 2. (line 185) [👍 Looks good] Feedback on: "assertProductId(value)"

---

## Label Summary

- **👍 Looks good**: 1

