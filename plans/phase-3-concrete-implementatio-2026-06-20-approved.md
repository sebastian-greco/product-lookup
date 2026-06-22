# Phase 3 Concrete Implementation Plan: Product REST API Behavior

## Scope

Phase 3 implements product REST API behavior only on `phase-3-api-behavior`.

In scope:

- `POST /api/v1/products`
- `GET /api/v1/products/:id`
- `GET /api/v1/products`
- TypeBox request, query, params, and response contracts
- Thin Fastify route handlers
- Product service layer between routes and repository
- Problem Details error responses for validation, not-found, duplicate SKU, and unexpected errors
- API integration tests covering create, get, list, filters, search, pagination, and error responses

Out of scope:

- OpenAPI UI polish
- Broad README/API docs work
- Phase 4 concerns such as auth, observability hardening, deployment, background jobs, admin behavior, or frontend/client work
- Repository rewrites or new database behavior beyond what the API layer needs
- New ORM, schema library, HTTP framework, or database client

## Current Repo Facts To Build On

Existing app/runtime files:

- `src/app/build-app.ts` creates Fastify with TypeBox provider, database plugin, and route registration.
- `src/app/register-routes.ts` currently registers only health routes.
- `src/routes/health.routes.ts` shows the existing route registration and TypeBox schema style.
- `test/helpers/build-test-app.ts` is the integration test app factory.
- `test/integration/health.test.ts` and `test/integration/database-plugin.test.ts` show request-level test patterns.

Existing persistence files:

- `src/repositories/products.repository.ts` already has `create`, `findById`, and `list`.
- `ProductsRepository.list` already normalizes unsafe pagination inputs and caps page size at `100`.
- Repository search already trims search and uses `ILIKE` on product name.
- Duplicate SKU is already represented by `DuplicateProductSkuError` from repository behavior.
- Migrations and seeds are already committed under `drizzle/` and `src/db/seeds/`.

Missing Phase 3 files:

- No `src/services/*` product service yet.
- No `src/schemas/*` product API schemas yet.
- No `src/errors/*` Problem Details mapping yet.
- No `src/routes/products.routes.ts` yet.
- No product API integration tests yet.

## Implementation Order

### 1. Add The API Error Foundation First

Add these files first:

- `src/errors/application-error.ts`
- `src/errors/problem-details.ts`
- `src/app/error-handler.ts`

Keep this minimal and framework-facing:

- `ApplicationError` should carry a stable error `code`, HTTP `status`, public `title`, and public `detail`.
- Add `NotFoundError` or `ProductNotFoundError` as the service-level 404 error.
- Do not move repository-specific persistence logic into errors.
- Do not expose database error messages.
- `problem-details.ts` should define the RFC 9457-style response shape and helpers for building responses.
- `error-handler.ts` should register one Fastify error handler used by the app.

Problem Details mapping:

- Fastify validation errors become `400` with type such as `https://product-lookup.local/problems/invalid-request`, title `Invalid request`, and a safe detail.
- Product not found becomes `404` with type such as `https://product-lookup.local/problems/product-not-found`.
- Duplicate SKU becomes `409` with type such as `https://product-lookup.local/problems/duplicate-product-sku`.
- Unexpected errors become `500` with type such as `https://product-lookup.local/problems/internal-server-error`, title `Internal server error`, and no leaked internals.
- Always include `instance` from `request.url`.
- Keep the response schema consistent across all errors: `type`, `title`, `status`, `detail`, `instance`.

Wire this from `src/app/build-app.ts` after app creation and before routes are registered.

TDD checkpoint:

- Start with product API tests that will eventually assert Problem Details shape. Do not over-test the helper in isolation unless error mapping becomes complex.
- If unit tests are added, keep them focused on pure mapping only.

Validation checkpoint:

- Run `pnpm typecheck` after introducing the error handler and types.
- Run `pnpm lint` if typecheck passes.

Recommended commit:

- `Add Problem Details error handling foundation`

### 2. Add Product API Schemas Before Routes

Add:

- `src/schemas/products.schemas.ts`

Define TypeBox contracts for:

- product status enum: `ACTIVE | INACTIVE`
- product response object
- create product body
- get product params
- list product querystring
- list product response
- Problem Details response, either in `src/errors/problem-details.ts` or imported into route schema definitions

Recommended response shape:

```json
{
  "id": "prd_...",
  "sku": "SKU-001",
  "name": "Example Product",
  "description": "Optional description",
  "category": "Example Category",
  "price": "19.99",
  "currency": "USD",
  "status": "ACTIVE",
  "created_at": "2026-06-20T00:00:00.000Z",
  "updated_at": "2026-06-20T00:00:00.000Z"
}
```

Recommended list response shape:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "page_size": 25,
    "total_items": 0,
    "total_pages": 0
  }
}
```

Schema rules:

- Use `page` and `page_size` in the querystring, matching repo docs.
- Default API-level `page` to `1` and `page_size` to a practical value such as `25`.
- Enforce max API-level `page_size` of `100`, matching repository normalization.
- Validate `status` against the product status enum.
- Keep `price` as a string in API responses because repository records preserve the Postgres numeric string.
- For create body, require `sku`, `name`, `category`, `price`, and `currency`.
- Keep `description` and `status` optional.
- Prefer strict additional-property behavior for request bodies if the existing Fastify/TypeBox setup supports it cleanly.

Avoid:

- OpenAPI-specific decoration or UI config.
- Creating generic shared schema dumping grounds.
- Encoding repository implementation details into route schemas.

TDD checkpoint:

- Add failing integration tests against `/api/v1/products` before implementing the route logic. Tests should use the schemas implicitly through HTTP validation.

Validation checkpoint:

- Run `pnpm typecheck` after schema definitions compile.

Recommended commit:

- `Add product API schemas`

### 3. Add Product Service Layer

Add:

- `src/services/products.service.ts`

Responsibilities:

- Accept typed API/service input.
- Call `createProductsRepository(app.db)` through dependency injection, not inside route bodies if avoidable.
- Provide service methods for create, get by ID, and list.
- Map `null` from `repository.findById` to `ProductNotFoundError`.
- Let `DuplicateProductSkuError` bubble to the centralized error handler or map it to an application-level duplicate SKU error in one place.
- Compute list pagination metadata from repository output and normalized API inputs.

Recommended service shape:

- `createProductsService(repository): ProductsService`
- `ProductsService.createProduct(input)`
- `ProductsService.getProduct(id)`
- `ProductsService.listProducts(query)`

Pagination behavior:

- Normalize API query values before calling repository so response metadata reflects the same page and page size used for the query.
- Use `page = 1` when missing or invalid after validation defaults.
- Use `page_size = 25` when missing.
- Use `page_size = 100` max.
- Still rely on repository-level normalization as the last safety net.
- Compute `total_pages` as `Math.ceil(totalCount / pageSize)` and return `0` when `totalCount` is `0`.

Filter/search behavior:

- Pass `category`, `status`, and `search` to repository list unchanged except for API-level trimming if needed for response consistency.
- Do not add new search semantics beyond existing repository `ILIKE` name search.
- Do not add SKU search, fuzzy ranking, external search, or additional filters in Phase 3.

TDD checkpoint:

- If service logic stays small, cover it primarily through integration tests.
- Add unit tests only if pagination metadata or error mapping becomes non-trivial enough to justify them.

Validation checkpoint:

- Run `pnpm typecheck`.
- Run `pnpm test -- products` if the test runner supports filtering; otherwise run `pnpm test`.

Recommended commit:

- `Add product service behavior`

### 4. Implement `POST /api/v1/products`

Add:

- `src/routes/products.routes.ts`

Register it from:

- `src/app/register-routes.ts`

Route behavior:

- `POST /api/v1/products`
- Validate request body with TypeBox.
- Call the product service.
- Return `201` with the product response.
- Duplicate SKU returns `409` Problem Details.
- Invalid body returns `400` Problem Details.
- Unexpected errors return `500` Problem Details.

Route design:

- The handler should only read request input, call service, and return output.
- No SQL, no Drizzle table imports, no direct repository query building in the route.
- Create the repository and service from `request.server.db` or a route-level closure.

Tests to write first:

- Creating a valid product returns `201` and the expected response shape.
- Missing required body field returns `400` Problem Details.
- Invalid status returns `400` Problem Details.
- Duplicate SKU returns `409` Problem Details.
- Response does not expose internal database errors.

Validation checkpoint:

- Run `pnpm test`.
- Run `pnpm typecheck`.
- Run `pnpm lint` if tests pass.

Recommended commit:

- `Add create product API endpoint`

### 5. Implement `GET /api/v1/products/:id`

Route behavior:

- `GET /api/v1/products/:id`
- Validate `id` as a prefixed product ID string.
- Call the product service.
- Return `200` with the product response when found.
- Return `404` Problem Details when repository returns `null`.
- Invalid ID format returns `400` Problem Details.

Tests to write first:

- Existing product ID returns `200` with the product.
- Unknown but well-formed product ID returns `404` Problem Details.
- Malformed product ID returns `400` Problem Details.

Validation checkpoint:

- Run `pnpm test`.
- Run `pnpm typecheck`.

Recommended commit:

- `Add get product API endpoint`

### 6. Implement `GET /api/v1/products`

Route behavior:

- `GET /api/v1/products`
- Validate querystring with TypeBox.
- Support `page`, `page_size`, `category`, `status`, and `search`.
- Return `200` with `data` and `pagination`.
- Use API defaults and max page size consistently with repository safeguards.

Pagination plan:

- API defaults: `page = 1`, `page_size = 25`.
- API max: `page_size = 100`.
- Validation should reject clearly invalid client input such as non-numeric page values, page below 1, or page size below 1.
- For `page_size > 100`, prefer returning `400` at the API layer if the schema has a maximum. The repository cap remains a defensive backstop.
- `total_items` comes from repository `totalCount`.
- `total_pages` is computed from `total_items` and normalized `page_size`.

Filters/search plan:

- `category` filters by exact category, using existing repository behavior.
- `status` filters by enum status.
- `search` uses existing repository name search behavior.
- Do not add SKU search or multi-column search in this phase.
- Do not add `sort` unless local Phase 3 docs explicitly require it.

Tests to write first:

- No query returns first page with default pagination metadata.
- Explicit `page` and `page_size` return matching metadata.
- `page_size=101` returns `400` Problem Details if API schema enforces max.
- Category filter returns only matching products.
- Status filter returns only matching products.
- Search returns name matches case-insensitively.
- Empty result returns `data: []`, `total_items: 0`, and `total_pages: 0`.
- Invalid query values return `400` Problem Details.

Validation checkpoint:

- Run `pnpm test`.
- Run `pnpm typecheck`.
- Run `pnpm lint`.

Recommended commit:

- `Add list products API endpoint`

### 7. Final Integration Hardening

Focus on behavior gaps only:

- Ensure all product routes use the same Problem Details shape.
- Ensure all success responses are TypeBox-covered.
- Ensure route files remain thin.
- Ensure service owns not-found behavior.
- Ensure repository remains persistence-only.
- Ensure tests reset or seed data deterministically using existing patterns.
- Ensure no route imports Drizzle tables directly.

Final validation commands:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm db:migrate
pnpm test
pnpm build
```

If the local database is not already prepared, use the existing project workflow:

```sh
pnpm db:setup
pnpm test
```

Recommended commit:

- `Harden product API integration behavior`

Only make this commit if it contains focused fixes discovered during final validation. Do not create a vague cleanup commit if no changes are needed.

## Atomic Commit Strategy

Use one commit per independently reviewable behavior slice:

1. `Add Problem Details error handling foundation`
2. `Add product API schemas`
3. `Add product service behavior`
4. `Add create product API endpoint`
5. `Add get product API endpoint`
6. `Add list products API endpoint`
7. `Harden product API integration behavior` only if final checks require follow-up fixes

Commit rules:

- Each endpoint commit should include its failing tests and implementation together.
- Do not commit tests far ahead of implementation unless ultrawork needs an explicit red-green checkpoint.
- Do not combine create/get/list endpoint work into one commit.
- Do not include formatting-only churn across unrelated files.
- Do not touch migrations unless a true Phase 3 API behavior issue proves the existing schema is insufficient.

## TDD Execution Sequence For Ultrawork

For each logical unit:

1. Write the smallest integration test that describes the expected API behavior.
2. Run the focused test and confirm it fails for the expected reason.
3. Implement the minimum code needed to pass.
4. Run the focused test again.
5. Run `pnpm typecheck`.
6. Run `pnpm lint` when the slice stabilizes.
7. Commit only the files for that slice.

Suggested order:

1. Error response shape tests through invalid product requests.
2. `POST /api/v1/products` happy path and validation failures.
3. Duplicate SKU conflict path.
4. `GET /api/v1/products/:id` happy path, not-found path, malformed ID path.
5. `GET /api/v1/products` default pagination.
6. List filters and search.
7. Invalid list query values.
8. Full CI-equivalent validation.

## File Addition Order

Add first:

- `src/errors/application-error.ts`
- `src/errors/problem-details.ts`
- `src/app/error-handler.ts`

Add next:

- `src/schemas/products.schemas.ts`
- `src/services/products.service.ts`

Add when endpoint work begins:

- `src/routes/products.routes.ts`
- `test/integration/products.api.test.ts`

Modify existing files only where needed:

- `src/app/build-app.ts` to register the error handler.
- `src/app/register-routes.ts` to register product routes.

Avoid adding:

- Generic `utils.ts`, `helpers.ts`, or `common.ts`.
- New DB migrations for API-only behavior.
- OpenAPI UI files.
- Broad docs files.

## Product Route Contract Details

Base path:

- `/api/v1/products`

Endpoints:

- `POST /api/v1/products` creates a product and returns `201`.
- `GET /api/v1/products/:id` returns one product or `404`.
- `GET /api/v1/products` returns a paginated list.

Status codes:

- `201` create success
- `200` read/list success
- `400` validation failure
- `404` product not found
- `409` duplicate SKU
- `500` unexpected error

Request/query names:

- Use `page`, not `pageNumber`.
- Use `page_size`, not `pageSize`, in HTTP query parameters.
- Use `category`, `status`, and `search` for list filters.

Response names:

- Use `data` for list response arrays, not `items`.
- Prefer snake_case for API response fields where the docs already specify snake_case pagination names.
- Keep product timestamps as ISO strings.
- Keep product `price` as a string to avoid decimal precision loss and align with repository output.

## Problem Details Shape

Use this shape for all API errors:

```json
{
  "type": "https://product-lookup.local/problems/invalid-request",
  "title": "Invalid request",
  "status": 400,
  "detail": "The request body or query parameters are invalid.",
  "instance": "/api/v1/products"
}
```

Recommended mappings:

- Validation error: `400`, `invalid-request`
- Product not found: `404`, `product-not-found`
- Duplicate SKU: `409`, `duplicate-product-sku`
- Unexpected error: `500`, `internal-server-error`

Implementation notes:

- Use Fastify’s validation error signal in the centralized error handler.
- Use `request.url` for `instance`.
- Log unexpected errors through Fastify logging, but do not include stack traces or database details in the response.
- Keep duplicate SKU mapping stable even though the repository detects it from a Postgres constraint.

## Pagination And Repository Normalization

API layer responsibility:

- Define client-facing defaults and validation.
- Reject invalid query values with `400`.
- Return metadata that reflects the effective page and page size.
- Keep response shape stable.

Repository responsibility:

- Remain the defensive persistence boundary.
- Continue normalizing unsafe pagination inputs and capping page size at `100`.
- Continue applying filters and search.

Recommended effective values:

- Default `page`: `1`
- Default `page_size`: `25`
- Maximum `page_size`: `100`

Important distinction:

- The API should not depend on repository normalization for normal client behavior.
- The repository normalization should remain as a safety net for unsafe internal callers.

## Validation Checkpoints

After error foundation:

```sh
pnpm typecheck
pnpm lint
```

After schemas:

```sh
pnpm typecheck
```

After service:

```sh
pnpm typecheck
pnpm test
```

After each endpoint:

```sh
pnpm test
pnpm typecheck
```

After all endpoints:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm db:migrate
pnpm test
pnpm build
```

CI-equivalent final checkpoint:

```sh
pnpm format:check && pnpm lint && pnpm typecheck && pnpm db:migrate && pnpm test && pnpm build
```

## Scope Traps To Avoid

Avoid these Phase 4 or out-of-scope items:

- OpenAPI UI, Swagger UI, or API reference polish.
- Authentication or authorization.
- Rate limiting.
- Request tracing, metrics, or production observability beyond basic safe error logging.
- Docker/deployment changes.
- New product update/delete endpoints.
- Product image/file upload behavior.
- Advanced search, ranking, fuzzy matching controls, or external search services.
- Sorting unless already required by the local Phase 3 docs.
- New database migrations unless a real blocker appears.
- Reworking repository tests that already pass.
- Replacing repository-level pagination normalization.
- Introducing generic shared helpers before duplication exists.
- Broad README or docs work beyond what is required to complete API behavior.

## Definition Of Done

Phase 3 is done when:

- All three product endpoints exist under `/api/v1/products`.
- All route inputs and responses are covered by TypeBox schemas.
- Routes stay thin and delegate to the product service.
- Product service delegates persistence to the repository.
- Problem Details responses are consistent for `400`, `404`, `409`, and `500`.
- API tests cover create, get, list, validation errors, duplicate SKU, not found, pagination defaults, max page size behavior, filters, and search.
- Final validation commands pass.
- No Phase 4 scope has been introduced.