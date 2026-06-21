import { afterEach, describe, expect, it } from 'vitest';

import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';

import { ProductNotFoundError } from '../../src/errors/product-not-found-error.js';
import { DuplicateProductSkuError } from '../../src/repositories/products.repository.js';
import { buildTestApp } from '../helpers/build-test-app.js';

describe('problem details handling', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('returns problem details for unmatched routes', async () => {
    app = buildTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/missing-route'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      type: 'https://product-lookup.dev/problems/product-not-found',
      title: 'Resource not found',
      status: 404,
      detail: 'No route matches GET /missing-route.',
      instance: '/missing-route'
    });
  });

  it('maps Fastify validation failures to invalid request problem details', async () => {
    app = buildTestApp();
    app.get(
      '/_test/validation',
      {
        schema: {
          querystring: Type.Object({
            page: Type.Integer({ minimum: 1 })
          })
        }
      },
      async () => {
        return { ok: true };
      }
    );

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/_test/validation?page=0'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: 'https://product-lookup.dev/problems/invalid-request',
      title: 'Invalid request',
      status: 400,
      detail: 'The request is invalid.',
      instance: '/_test/validation?page=0'
    });
    expect(response.json().errors).toBeInstanceOf(Array);
  });

  it('maps duplicate SKU errors to conflict problem details', async () => {
    app = buildTestApp();
    app.post('/_test/duplicate-sku', async () => {
      throw new DuplicateProductSkuError('SKU-001');
    });

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/_test/duplicate-sku'
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      type: 'https://product-lookup.dev/problems/duplicate-product-sku',
      title: 'Duplicate product SKU',
      status: 409,
      detail: 'A product with SKU SKU-001 already exists.',
      instance: '/_test/duplicate-sku'
    });
  });

  it('maps product lookup misses to not found problem details', async () => {
    app = buildTestApp();
    app.get('/_test/product-not-found', async () => {
      throw new ProductNotFoundError('prd_01J0000000000000000000000');
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/_test/product-not-found'
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      type: 'https://product-lookup.dev/problems/product-not-found',
      title: 'Product not found',
      status: 404,
      detail: 'Product prd_01J0000000000000000000000 was not found.',
      instance: '/_test/product-not-found'
    });
  });

  it('hides internals behind a safe 500 problem details response', async () => {
    app = buildTestApp();
    app.get('/_test/unexpected-error', async () => {
      throw new Error('secret failure details');
    });

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/_test/unexpected-error'
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      type: 'https://product-lookup.dev/problems/internal-server-error',
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance: '/_test/unexpected-error'
    });
  });
});
