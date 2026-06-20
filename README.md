# product-lookup

Phase 2 backend scaffold for a Fastify service with committed Drizzle migrations, runtime database wiring, product ID/domain helpers, repository integration tests, and a deterministic local seed workflow.

## Stack

- Node.js LTS
- pnpm
- Fastify 5
- TypeBox
- Drizzle ORM
- PostgreSQL via `pg`
- Vitest
- PostgreSQL via Docker Compose for local development

## Prerequisites

- Node.js 20.x
- pnpm 10+
- Docker Desktop or a compatible Docker runtime

## Environment variables

The app loads configuration from environment variables with these defaults:

- `NODE_ENV` — defaults to `development`. Allowed values: `development`, `test`, `production`.
- `HOST` — defaults to `0.0.0.0`.
- `PORT` — defaults to `3000`.
- `LOG_LEVEL` — defaults to `info`. Allowed values: `debug`, `info`, `warn`, `error`.
- `DATABASE_URL` — defaults to `postgresql://product_lookup:product_lookup@127.0.0.1:5433/product_lookup`.

`PORT` must be a whole number between `1` and `65535`.

`DATABASE_URL` must be a valid PostgreSQL connection string using the `postgres://` or `postgresql://` scheme.

For local development, copy the example file if you want a checked local starting point:

```bash
cp .env.example .env
```

When `.env` is present, local runs load it automatically before config parsing. That applies to `pnpm dev`, `pnpm db:migrate`, `pnpm db:seed`, and other entrypoints that call `loadConfig()`, while still allowing already-exported shell variables to win.

## Local database setup

Install dependencies first:

```bash
pnpm install
```

Start the local Postgres container:

```bash
docker compose up -d
```

The default local database is:

- host: `127.0.0.1`
- port: `5433`
- database: `product_lookup`
- user: `product_lookup`
- password: `product_lookup`

Apply migrations and seed deterministic sample data:

```bash
pnpm db:setup
```

If you only need one step:

```bash
pnpm db:migrate
pnpm db:seed
```

The seed workflow is intentionally deterministic for local development. Running `pnpm db:seed` clears the current `products` table contents and replaces them with the same fixed sample dataset every time, so repository tests and manual local checks start from a known state.

## Run the app locally

```bash
pnpm dev
```

The development server starts from `src/server.ts`. The current app still exposes the health endpoint at `GET /health`; Phase 2 in this branch is focused on database/domain groundwork rather than product API routes.

## Scripts

- `pnpm dev` — run the Fastify server in watch mode
- `pnpm build` — compile TypeScript to `dist/`
- `pnpm lint` — run ESLint
- `pnpm format` — apply Prettier formatting
- `pnpm format:check` — verify formatting without writing changes
- `pnpm typecheck` — run the TypeScript compiler without emitting files
- `pnpm db:generate` — generate Drizzle migration files from schema changes
- `pnpm db:migrate` — apply committed Drizzle migrations to the configured database
- `pnpm db:seed` — replace local product data with the deterministic seed dataset
- `pnpm db:setup` — run migrations and then seed the local database
- `pnpm test` — run the Vitest suite
- `pnpm test:watch` — run Vitest in watch mode

## Testing and local prerequisites

The project is still integration-first. App-level tests use the Fastify app factory, and repository tests use the configured PostgreSQL database directly through the app's shared Drizzle client.

Before running repository or database-related tests locally:

1. start the local Postgres container with `docker compose up -d`
2. apply migrations with `pnpm db:migrate`

Seeding is optional for the current repository tests because they create and clean up their own records, but `pnpm db:seed` is useful when you want a predictable local dataset for manual inspection.

Current test layout:

```text
test/
  helpers/
  integration/
  unit/
```

## Architecture shape

The project follows the layer-first structure defined in `AGENTS.md`.

```text
src/
  app/
  config/
  db/
    schema/
    seeds/
  ids/
  repositories/
  routes/
  types/
test/
  helpers/
  integration/
  unit/
```

## CI

GitHub Actions currently runs the main project checks on pushes and pull requests:

1. install
2. format check
3. lint
4. typecheck
5. test
6. build

## Current Phase 2 status

Implemented in slices 1-6:

- tooling, formatting, linting, test, and CI scaffold
- typed environment loading and Fastify app/runtime setup
- local PostgreSQL development flow via Docker Compose
- Drizzle schema definitions and committed migrations
- runtime PostgreSQL pool and Drizzle client wiring
- product ID helper with prefixed ULID validation
- product repository create/find/list methods with integration coverage
- deterministic local seed workflow for the `products` table

Not implemented yet:

- product HTTP routes and Phase 3 API behavior
- broader service/business workflow layers beyond the current repository/domain groundwork
