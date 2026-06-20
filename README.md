# product-lookup

Phase 1 foundation for a Fastify backend service. The current scope is limited to runtime scaffolding, typed configuration, a health route, project checks, local Postgres development support, and CI.

## Stack

- Node.js LTS
- pnpm
- Fastify 5
- TypeBox
- Vitest
- PostgreSQL via Docker Compose for local development

## Getting started

### Prerequisites

- Node.js 20.x
- pnpm 10+
- Docker Desktop or compatible Docker runtime

### Install dependencies

```bash
pnpm install
```

### Run the app locally

```bash
pnpm dev
```

The development server starts from `src/server.ts`. The current app exposes a single health endpoint at `GET /health`.

### Start local Postgres

```bash
docker compose up -d
```

The default local database is:

- host: `127.0.0.1`
- port: `5432`
- database: `product_lookup`
- user: `product_lookup`
- password: `product_lookup`

This database container is for local and hybrid development only. Runtime database wiring, schema, and migrations are intentionally not part of Phase 1 yet.

## Environment variables

The current app reads configuration from environment variables with these defaults:

- `NODE_ENV` — `development` by default. Allowed values: `development`, `test`, `production`.
- `HOST` — `0.0.0.0` by default.
- `PORT` — `3000` by default.
- `LOG_LEVEL` — `info` by default. Allowed values: `debug`, `info`, `warn`, `error`.

`PORT` must be a whole number between `1` and `65535`.

## Scripts

- `pnpm dev` — run the Fastify server in watch mode
- `pnpm build` — compile TypeScript to `dist/`
- `pnpm lint` — run ESLint
- `pnpm format` — apply Prettier formatting
- `pnpm format:check` — verify formatting without writing changes
- `pnpm typecheck` — run the TypeScript compiler without emitting files
- `pnpm test` — run Vitest integration tests

## Testing approach

Phase 1 tests are integration-first and use Fastify's inject support against the app factory in `src/app/build-app.ts`. Tests do not open a network port.

Current test scaffolding lives under:

```text
test/
  helpers/
  integration/
```

## Architecture shape

The project follows the layer-first structure defined in `AGENTS.md`.

```text
src/
  app/
  config/
  routes/
test/
  helpers/
  integration/
```

Current Phase 1 code includes:

- app construction in `src/app/`
- typed environment loading in `src/config/env.ts`
- route registration in `src/app/register-routes.ts`
- a health endpoint in `src/routes/health.routes.ts`

## CI

GitHub Actions runs the Phase 1 checks on pushes and pull requests:

1. install
2. format check
3. lint
4. typecheck
5. test
6. build

## Phase 1 status

Implemented in this phase:

- Fastify runtime scaffold
- typed config loading
- development-friendly logging
- health route
- integration test scaffold
- CI workflow
- Docker Compose for local Postgres

Not implemented yet:

- database runtime integration
- schema or migrations
- product APIs or business workflows
