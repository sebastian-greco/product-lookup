import { afterEach, describe, expect, it } from 'vitest';

import type { FastifyInstance } from 'fastify';

import { buildTestApp } from '../helpers/build-test-app.js';

describe('database plugin', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('decorates the app with a database pool and Drizzle client', async () => {
    app = buildTestApp();

    await app.ready();

    expect(app.dbPool).toBeDefined();
    expect(app.db).toBeDefined();
    expect(app.dbPool.ended).toBe(false);
  });

  it('closes the shared pool when the app closes', async () => {
    app = buildTestApp();

    await app.ready();

    const pool = app.dbPool;

    await app.close();
    app = undefined;

    expect(pool.ended).toBe(true);
  });
});
