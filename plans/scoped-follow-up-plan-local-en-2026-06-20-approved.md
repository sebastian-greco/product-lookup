# Scoped Follow-Up Plan: Local `.env` Loading + Full Docker Runtime

Branch: `phase-3-api-behavior`

## Goal

Make the service runnable in both supported modes without broad refactors:

- Local without Docker: a real `.env` file is loaded by the app/tooling entrypoints, so local overrides work.
- Full Docker: `docker compose up` can run both PostgreSQL and the Fastify app.
- Existing DB-only/local development remains practical.
- README/docs clearly describe both startup paths and validation.

## Constraints

- Do not change API behavior beyond startup/config/runtime wiring.
- Do not refactor route, service, repository, or schema layers.
- Keep `loadConfig()` as the central config boundary.
- Keep secrets out of git; `.env` stays ignored and `.env.example` remains the committed template.
- Prefer Node built-in env-file loading if the repo's configured Node LTS supports it; otherwise add the smallest appropriate dependency and load it only at startup/config boundary.
- Production Docker image should run compiled JS, not TypeScript source.

## Existing Context To Preserve

- `src/config/env.ts` already validates config from `process.env`.
- `src/server.ts`, `src/db/migrate.ts`, `src/db/seed.ts`, and `drizzle.config.ts` already use the central config path.
- `docker-compose.yml` currently starts only PostgreSQL.
- `README.md` currently documents a database-only Docker workflow and local `pnpm` workflow.

## Execution Approach

This should be a quick implementation, not a test-expansion pass.

- Do not add new tests for this follow-up.
- Do not refactor app, route, service, repository, or schema code.
- Validate with existing checks plus manual local and Docker smoke tests.
- Keep each commit independently reviewable and easy to revert.

## Commit 1: Load `.env` Through The Existing Config Boundary

Intent: make local `.env` values apply consistently without spreading env loading across the app.

Implementation steps:

- Add a small env-file preload near `src/config/env.ts`, keeping `loadConfig()` as the public config API.
- Load `.env` before config validation when the file exists.
- Preserve shell/CI environment precedence over `.env` values.
- Prefer Node built-in env-file loading if the repo's Node LTS supports it.
- If Node built-in loading is not viable, add the smallest appropriate dependency, likely `dotenv`, and keep it contained to config/bootstrap.
- Avoid adding `dotenv/config` imports across multiple entrypoints unless there is no cleaner option.

Validation after commit:

- Create or update local `.env` from `.env.example`, without committing it.
- Set a non-default `PORT` or other harmless value in `.env` and confirm `pnpm dev` uses it.
- Confirm an exported shell value still wins over `.env` when both are set.
- Run `pnpm typecheck`.
- Run `pnpm lint`.

Atomic commit message:

- `Load local env files through config`

## Commit 2: Confirm Runtime Entrypoints Use The Same Env Behavior

Intent: make server, migration, seed, and Drizzle CLI paths all benefit from the `.env` loader.

Implementation steps:

- Verify `src/server.ts`, `src/db/migrate.ts`, `src/db/seed.ts`, and `drizzle.config.ts` all go through the central config loader.
- Add only minimal changes if any entrypoint bypasses `loadConfig()` or reads env too early.
- Review package scripts only for necessary startup clarity.
- Do not add duplicate scripts unless they materially improve the local workflow.

Validation after commit:

- Run `pnpm db:migrate` against a real local or Compose-started Postgres using `.env` values.
- Run `pnpm db:seed` if the README currently presents seed as part of startup.
- Run `pnpm dev` and verify the server starts from `.env` values.
- Run `pnpm build`.

Atomic commit message:

- `Use env loading across runtime entrypoints`

## Commit 3: Add A Minimal Production-Appropriate Docker Image

Intent: build and run the API as a container without changing app behavior.

Implementation steps:

- Add a multi-stage `Dockerfile`.
- Use a Node LTS base image compatible with the repo's configured runtime.
- Enable Corepack and install dependencies with pnpm using the lockfile.
- Build TypeScript in the build stage.
- Copy only compiled output and production runtime dependencies into the final image.
- Run the final container as a non-root user.
- Set the container command to run compiled server output.
- Ensure Docker runtime config binds the app to `0.0.0.0`, while local development can keep its existing behavior.
- Add `.dockerignore` to exclude `node_modules`, build output, coverage, local env files, git metadata, and other non-build inputs.

Validation after commit:

- `pnpm build`
- `docker build -t product-lookup-api:local .`
- `docker run --rm product-lookup-api:local node --version`
- If the app requires a DB connection immediately at startup, defer full startup validation to the Compose commit.

Atomic commit message:

- `Add Docker image for API service`

## Commit 4: Wire The App Into Docker Compose

Intent: make `docker compose up` run PostgreSQL and the Fastify app together.

Implementation steps:

- Extend `docker-compose.yml` with an app service built from the new Dockerfile.
- Keep the existing Postgres service and volume behavior unless a change is strictly required.
- Use Compose `env_file` for app runtime variables.
- Use explicit `environment` only for container-specific overrides, especially `DATABASE_URL` pointing at the Compose Postgres service name rather than `localhost`.
- Publish the app port to the host.
- Add a Postgres healthcheck using `pg_isready`.
- Gate the app on Postgres health with `depends_on: condition: service_healthy` if supported by the local Compose version.
- Do not run migrations automatically on app startup unless the repo already has that convention.
- Keep the Docker flow simple: start stack, run migrations explicitly, verify app response.

Validation after commit:

- `docker compose config`
- `docker compose up --build -d postgres`
- Run the supported migration command against the Compose database.
- `docker compose up --build app`
- `curl http://localhost:<published-port>/<existing-health-or-root-endpoint>` using an endpoint that already exists.
- `docker compose logs app`
- `docker compose down`

Atomic commit message:

- `Run API service with Docker Compose`

## Commit 5: Update README And Env Documentation

Intent: document the two supported startup paths clearly.

Implementation steps:

- Update `README.md` prerequisites for Node LTS, pnpm/Corepack, Docker, and PostgreSQL options.
- Document local-without-Docker setup:
  - copy `.env.example` to `.env`
  - set `DATABASE_URL`
  - run migrations and seed only as currently appropriate
  - run `pnpm dev`
- Document full Docker setup:
  - create the needed `.env` file from `.env.example`
  - run `docker compose up --build`
  - run migrations using the documented command
  - verify the app endpoint from the host
- Clarify that `.env` is ignored and should contain local secrets only.
- Clarify that local `DATABASE_URL` usually uses `localhost`, while Compose uses the Postgres service name.
- Update `.env.example` comments only if needed to support both workflows.
- Keep docs minimal; do not add deployment platform guidance.

Validation after commit:

- Run the README local startup commands exactly as written.
- Run the README Docker startup commands exactly as written.
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

Atomic commit message:

- `Document local and Docker startup paths`

## Final Smoke Validation

Run this before considering the follow-up done:

- Local workflow:
  - Start from a shell without exported overrides for the values being tested.
  - Ensure `.env` exists and points at a reachable real PostgreSQL database.
  - Run `pnpm db:migrate`.
  - Run `pnpm dev`.
  - Verify the app responds on the configured local port.
- Docker workflow:
  - Run `docker compose config`.
  - Run `docker compose up --build`.
  - Run the documented migration step if migrations are not automatic.
  - Verify the app responds through the published port.
  - Inspect app logs for config or DB connection errors.
- Existing project checks:
  - `pnpm format:check`
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm build`

## Ultrawork Execution Notes

- Execute one commit at a time; do not batch env loading, Dockerfile, Compose, and docs into one change.
- For each commit: make the smallest implementation change, run the narrow smoke check, then run the relevant broader checks.
- Do not add tests for this follow-up unless the user later reverses that instruction.
- If Docker migration execution requires changing the image shape substantially, stop and choose the smaller production-appropriate path rather than adding broad runtime tooling.
- If Compose healthcheck support differs by local Docker Compose version, document the minimum version or use the simplest compatible behavior instead of adding custom wait scripts.
- Do not add deployment-specific concerns such as Kubernetes manifests, CI publishing, reverse proxies, TLS, observability stacks, or unrelated health endpoint redesigns.

## Risks And Tradeoffs

- Node native `.env` loading avoids a dependency but depends on the repo's Node LTS baseline. Verify before choosing it.
- Running migrations automatically in the app container is convenient but can be unsafe in production-like workflows. Prefer explicit migration commands unless the project owner asks for auto-migration.
- Compose env precedence can surprise users. Keep the docs clear about `.env` for local app config versus Compose interpolation and container environment.
- A non-root production image may expose file ownership issues. Catch this with `docker build` and compose startup validation.
