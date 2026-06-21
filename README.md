# product-lookup

Backend service for creating, reading, and listing products. The current branch includes the Phase 4 API documentation work: Fastify route metadata, OpenAPI generation, Swagger UI, committed Drizzle migrations, deterministic local seed data, repository integration coverage, and both host-run and Docker Compose workflows.

## Stack

- Node.js LTS, currently tested with Node 20.x
- pnpm 10+
- Fastify 5
- TypeBox for request and response schemas
- Drizzle ORM
- PostgreSQL through `pg`
- Vitest
- Docker Compose for local app and database development

## Prerequisites

- Node.js 20.x
- pnpm 10+
- Docker Desktop or a compatible Docker runtime

## Environment variables

The app loads configuration from environment variables with these defaults:

| Variable       | Default                                                                    | Notes                                                |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| `NODE_ENV`     | `development`                                                              | Allowed values: `development`, `test`, `production`  |
| `HOST`         | `0.0.0.0`                                                                  | Bind host for the Fastify server                     |
| `PORT`         | `3000`                                                                     | Must be a whole number from `1` to `65535`           |
| `LOG_LEVEL`    | `info`                                                                     | Allowed values: `debug`, `info`, `warn`, `error`     |
| `DATABASE_URL` | `postgresql://product_lookup:product_lookup@127.0.0.1:5433/product_lookup` | Must use the `postgres://` or `postgresql://` scheme |

For local host-run development, copy the example file if you want a checked starting point:

```bash
cp .env.example .env
```

When `.env` is present, local entrypoints that call `loadConfig()` read it before config parsing. Already exported shell variables still win. Docker Compose sets container-only values on the `app` service, so the app container uses the `postgres` service hostname while host-run development can keep using `127.0.0.1:5433`.

## Full Docker workflow

Build and start both PostgreSQL and the Fastify app:

```bash
docker compose up --build
```

The `app` service waits for the `postgres` health check, runs committed migrations, applies deterministic seed data, and starts the dev server at `http://127.0.0.1:3000`.

The container runs `pnpm db:setup` on startup. Restarting the `app` service resets the seeded `products` table to the same sample records, which keeps manual checks predictable.

## Host-run local workflow

Install dependencies:

```bash
pnpm install
```

Start only PostgreSQL in Docker:

```bash
docker compose up -d postgres
```

The default local database is:

| Field    | Value            |
| -------- | ---------------- |
| host     | `127.0.0.1`      |
| port     | `5433`           |
| database | `product_lookup` |
| user     | `product_lookup` |
| password | `product_lookup` |

Apply migrations and seed the deterministic sample dataset:

```bash
pnpm db:setup
```

Or run the steps separately:

```bash
pnpm db:migrate
pnpm db:seed
```

Start the app on your host:

```bash
pnpm dev
```

The server starts from `src/server.ts` and listens on `http://127.0.0.1:3000` with the default config.

## Documentation surface

OpenAPI is generated from the same TypeBox schemas and route metadata used by Fastify at runtime.

| URL                       | Purpose               |
| ------------------------- | --------------------- |
| `GET /documentation/`     | Swagger UI            |
| `GET /documentation/json` | OpenAPI JSON document |
| `GET /documentation/yaml` | OpenAPI YAML document |

The documented API groups routes under `health` and `products`. Product operations include operation IDs, request schemas, response schemas, pagination metadata, and Problem Details error responses.

## API examples

All examples assume the app is running on `http://127.0.0.1:3000`.

### Health check

```bash
curl http://127.0.0.1:3000/health
```

Response:

```json
{
  "status": "ok"
}
```

### Create a product

```bash
curl -X POST http://127.0.0.1:3000/api/v1/products \
  -H 'content-type: application/json' \
  -d '{
    "sku": "SKU-POST-001",
    "name": "Launch Phone",
    "description": "256GB graphite",
    "category": "Electronics",
    "price": "1099.99",
    "currency": "EUR",
    "status": "ACTIVE"
  }'
```

Response status: `201 Created`.

```json
{
  "id": "prd_01J00000000000000000000000",
  "sku": "SKU-POST-001",
  "name": "Launch Phone",
  "description": "256GB graphite",
  "category": "Electronics",
  "price": "1099.99",
  "currency": "EUR",
  "status": "ACTIVE",
  "created_at": "2026-06-21T12:00:00.000Z",
  "updated_at": "2026-06-21T12:00:00.000Z"
}
```

If `status` is omitted, the database default is `ACTIVE`. Product IDs are generated by the service and use the `prd_` prefixed ULID format.

### Get a product by ID

```bash
curl http://127.0.0.1:3000/api/v1/products/prd_01J00000000000000000000000
```

Response status: `200 OK`.

```json
{
  "id": "prd_01J00000000000000000000000",
  "sku": "SKU-POST-001",
  "name": "Launch Phone",
  "description": "256GB graphite",
  "category": "Electronics",
  "price": "1099.99",
  "currency": "EUR",
  "status": "ACTIVE",
  "created_at": "2026-06-21T12:00:00.000Z",
  "updated_at": "2026-06-21T12:00:00.000Z"
}
```

### List products

```bash
curl 'http://127.0.0.1:3000/api/v1/products?page=1&page_size=20&category=Electronics&status=ACTIVE&search=phone'
```

Response status: `200 OK`.

```json
{
  "data": [
    {
      "id": "prd_01J00000000000000000000000",
      "sku": "SKU-POST-001",
      "name": "Launch Phone",
      "description": "256GB graphite",
      "category": "Electronics",
      "price": "1099.99",
      "currency": "EUR",
      "status": "ACTIVE",
      "created_at": "2026-06-21T12:00:00.000Z",
      "updated_at": "2026-06-21T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

Supported list filters:

- `page`: 1-based page number, default `1`
- `page_size`: items per page, default `20`, maximum `100`
- `category`: exact category match
- `status`: exact status match, `ACTIVE` or `INACTIVE`
- `search`: case-insensitive substring match against product name

Results are ordered by product name, then product ID, so pagination has a stable order for the current dataset.

## Error format

Errors use a Problem Details shape based on RFC 9457.

```json
{
  "type": "https://product-lookup.dev/problems/invalid-request",
  "title": "Invalid request",
  "status": 400,
  "detail": "The request is invalid.",
  "instance": "/api/v1/products",
  "errors": []
}
```

Common product API errors:

| Status | Type                                                        | When it happens                                |
| ------ | ----------------------------------------------------------- | ---------------------------------------------- |
| `400`  | `https://product-lookup.dev/problems/invalid-request`       | Request params, query, or body fail validation |
| `404`  | `https://product-lookup.dev/problems/product-not-found`     | Product ID does not exist, or no route matches |
| `409`  | `https://product-lookup.dev/problems/duplicate-product-sku` | Create request reuses an existing SKU          |
| `500`  | `https://product-lookup.dev/problems/internal-server-error` | Unexpected server failure                      |

Validation failures include an `errors` array from Fastify. Other Problem Details responses include `type`, `title`, `status`, and usually `detail` plus `instance`.

## Architecture and design decisions

The repo follows the layer-first shape described in `AGENTS.md`:

```text
src/
  app/             Fastify construction, plugins, route registration
  config/          typed environment loading
  db/              Drizzle client, migrations, schema, seed workflow
  errors/          domain errors and Problem Details helpers
  ids/             product ID generation and validation
  repositories/    database access through Drizzle
  routes/          Fastify route registration only
  schemas/         TypeBox request and response contracts
  services/        product use cases and response mapping
  types/           local type declarations
test/
  helpers/
  integration/
  unit/
```

Key decisions:

- Routes register endpoints, attach schemas, read request input, and call services. They don't build SQL or contain product workflows.
- Services own use-case behavior and map repository records into API response shapes.
- Repositories own persistence and explicitly project selected columns in `select` and `returning` clauses.
- TypeBox schemas are the source for Fastify runtime validation and OpenAPI output.
- Problem Details mapping is centralized in a Fastify plugin so route handlers don't return raw internal errors.
- IDs use the `prd_` prefixed ULID format, validated by both the API schema and a database check constraint.

## Database schema overview

Committed Drizzle migrations create the database features used by the service, including `pg_trgm`, the product status enum, and the `products` table.

### `product_status` enum

- `ACTIVE`
- `INACTIVE`

### `products` table

| Column        | Notes                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| `id`          | primary key, `prd_` prefixed ULID, checked with `products_id_format_check`       |
| `sku`         | required, unique, non-blank                                                      |
| `name`        | required, non-blank                                                              |
| `description` | optional text                                                                    |
| `category`    | required, non-blank                                                              |
| `price`       | numeric amount stored as a string in application code, must be greater than zero |
| `currency`    | three uppercase letters                                                          |
| `status`      | `product_status`, default `ACTIVE`                                               |
| `created_at`  | timestamp with time zone, defaults to now                                        |
| `updated_at`  | timestamp with time zone, defaults to now                                        |

Indexes:

- `products_sku_unique_idx` on `sku`
- `products_category_idx` on `category`
- `products_status_idx` on `status`
- `products_name_trgm_idx` as a GIN trigram index on `name`

The deterministic seed workflow clears and replaces product data for local development. It is meant for local and disposable databases, not shared production data.

## Pagination strategy

List endpoints use `page` and `page_size`.

- `page` defaults to `1`.
- `page_size` defaults to `20`.
- `page_size` is capped at `100`.
- Responses include `total_items` and `total_pages`.
- The repository normalizes unsafe page inputs before querying.
- The API schema rejects invalid query parameters before the service runs.

The current implementation uses offset pagination because it is simple and clear for this phase. For very large product catalogs or high-write workloads, cursor pagination should be reconsidered before production.

## Scripts

- `pnpm dev`: run the Fastify server in watch mode
- `pnpm build`: compile TypeScript to `dist/`
- `pnpm lint`: run ESLint
- `pnpm format`: apply Prettier formatting
- `pnpm format:check`: verify formatting without writing changes
- `pnpm typecheck`: run the TypeScript compiler without emitting files
- `pnpm db:generate`: generate Drizzle migration files from schema changes
- `pnpm db:migrate`: apply committed Drizzle migrations to the configured database
- `pnpm db:seed`: replace local product data with the deterministic seed dataset
- `pnpm db:setup`: run migrations and then seed the local database
- `pnpm test`: run the Vitest suite
- `pnpm test:watch`: run Vitest in watch mode

## Testing

The project is integration-first. App-level tests use the Fastify app factory, and repository tests use the configured PostgreSQL database through the shared Drizzle client.

Before running database-backed tests locally:

```bash
docker compose up -d postgres
pnpm db:migrate
```

Seeding is optional for tests because the current suites create and clean up their own records. Use `pnpm db:seed` when you want predictable product records for manual API checks.

Run the main checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## CI

GitHub Actions runs the main project checks on pushes and pull requests:

1. install
2. format check
3. lint
4. typecheck
5. test
6. build

## Tradeoffs in the current implementation

- Offset pagination is easy to document and test, but it can become slow or inconsistent on large, frequently changing result sets.
- Search is intentionally simple PostgreSQL `ILIKE` against product name. The trigram index supports that path without adding an external search service.
- The local seed command resets product data by design. That is useful for repeatable local checks, but unsafe for shared environments.
- Authentication, authorization, rate limiting, and tenant boundaries are not part of this phase.
- `updated_at` is set on insert by the database schema. There is no update endpoint yet, so automatic update-time maintenance has not been added.

## Before production

- Add authentication and authorization for product writes and any private reads.
- Decide whether Swagger UI should be public, protected, or disabled outside non-production environments.
- Add request rate limits and body size limits that match expected traffic.
- Add production-safe database migration and seed procedures. Do not run the local deterministic seed against production.
- Add operational health checks that verify database connectivity if the deployment platform needs readiness semantics beyond `GET /health`.
- Add structured logging fields for request correlation and production incident review.
- Revisit pagination and search strategy with real data volume and query patterns.
- Add deployment-specific configuration docs once the target platform is chosen.
