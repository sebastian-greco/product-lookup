import { afterEach, describe, expect, it } from 'vitest';

import type { FastifyInstance } from 'fastify';

import { buildTestApp } from '../helpers/build-test-app.js';

describe('health route', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('returns an ok status without opening a network port', async () => {
    app = buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({ status: 'ok' });
  });
});
