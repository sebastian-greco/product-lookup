import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { FastifyInstance } from 'fastify';

import { productsTable } from '../../src/db/schema/index.js';
import { createProductsRepository } from '../../src/repositories/products.repository.js';
import { buildTestApp } from '../helpers/build-test-app.js';

describe('products routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
    await migrate(app.db, { migrationsFolder: './drizzle' });
  });

  afterEach(async () => {
    await app.db.delete(productsTable);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a product through POST /api/v1/products', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: {
        sku: 'SKU-POST-001',
        name: 'Launch Phone',
        description: '256GB graphite',
        category: 'Electronics',
        price: '1099.99',
        currency: 'EUR'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: expect.stringMatching(/^prd_[0-9A-HJKMNP-TV-Z]{26}$/),
      sku: 'SKU-POST-001',
      name: 'Launch Phone',
      description: '256GB graphite',
      category: 'Electronics',
      price: '1099.99',
      currency: 'EUR',
      status: 'ACTIVE'
    });
    expect(response.json().created_at).toEqual(expect.any(String));
    expect(response.json().updated_at).toEqual(expect.any(String));
  });

  it('returns validation problem details for invalid create requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: {
        sku: '',
        name: 'Bad Product',
        category: 'Electronics',
        price: '10.00',
        currency: 'EUR'
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: 'https://product-lookup.dev/problems/invalid-request',
      title: 'Invalid request',
      status: 400,
      detail: 'The request is invalid.',
      instance: '/api/v1/products'
    });
    expect(response.json().errors).toBeInstanceOf(Array);
  });

  it('returns conflict problem details when creating a duplicate SKU', async () => {
    const payload = {
      sku: 'SKU-DUPE-001',
      name: 'Original Phone',
      category: 'Electronics',
      price: '799.99',
      currency: 'EUR'
    };

    await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      type: 'https://product-lookup.dev/problems/duplicate-product-sku',
      title: 'Duplicate product SKU',
      status: 409,
      detail: 'A product with SKU SKU-DUPE-001 already exists.',
      instance: '/api/v1/products'
    });
  });

  it('returns a product by id and maps missing products to 404', async () => {
    const repository = createProductsRepository(app.db);
    const created = await repository.create({
      sku: 'SKU-GET-001',
      name: 'Lookup Phone',
      category: 'Electronics',
      price: '699.99',
      currency: 'EUR'
    });

    const foundResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${created.id}`
    });

    expect(foundResponse.statusCode).toBe(200);
    expect(foundResponse.json()).toMatchObject({
      id: created.id,
      sku: 'SKU-GET-001',
      name: 'Lookup Phone'
    });

    const missingResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products/prd_01J00000000000000000000000'
    });

    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual({
      type: 'https://product-lookup.dev/problems/product-not-found',
      title: 'Product not found',
      status: 404,
      detail: 'Product prd_01J00000000000000000000000 was not found.',
      instance: '/api/v1/products/prd_01J00000000000000000000000'
    });
  });

  it('returns validation problem details for invalid product ids', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products/not-a-product-id'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: 'https://product-lookup.dev/problems/invalid-request',
      title: 'Invalid request',
      status: 400,
      detail: 'The request is invalid.',
      instance: '/api/v1/products/not-a-product-id'
    });
  });

  it('lists products with defaults, max page size, totals, and filters', async () => {
    const repository = createProductsRepository(app.db);

    await repository.create({
      sku: 'SKU-LIST-001',
      name: 'Alpha iPhone',
      category: 'Electronics',
      price: '899.99',
      currency: 'EUR'
    });
    await repository.create({
      sku: 'SKU-LIST-002',
      name: 'Bravo iPhone',
      category: 'Electronics',
      price: '949.99',
      currency: 'EUR'
    });
    await repository.create({
      sku: 'SKU-LIST-003',
      name: 'Charlie iPhone',
      category: 'Electronics',
      price: '999.99',
      currency: 'EUR'
    });
    await repository.create({
      sku: 'SKU-LIST-004',
      name: 'Delta iPhone',
      category: 'Electronics',
      price: '799.99',
      currency: 'EUR',
      status: 'INACTIVE'
    });
    await repository.create({
      sku: 'SKU-LIST-005',
      name: 'Office Chair',
      category: 'Furniture',
      price: '199.99',
      currency: 'EUR'
    });

    const filteredResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products?page=1&page_size=2&category=Electronics&status=ACTIVE&search=IPHONE'
    });

    expect(filteredResponse.statusCode).toBe(200);
    expect(filteredResponse.json()).toEqual({
      data: [
        expect.objectContaining({ name: 'Alpha iPhone' }),
        expect.objectContaining({ name: 'Bravo iPhone' })
      ],
      pagination: {
        page: 1,
        page_size: 2,
        total_items: 3,
        total_pages: 2
      }
    });

    const defaultedResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products?search=chair'
    });

    expect(defaultedResponse.statusCode).toBe(200);
    expect(defaultedResponse.json()).toEqual({
      data: [expect.objectContaining({ name: 'Office Chair' })],
      pagination: {
        page: 1,
        page_size: 20,
        total_items: 1,
        total_pages: 1
      }
    });

    const maxedResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/products?page=1&page_size=100&category=Electronics'
    });

    expect(maxedResponse.statusCode).toBe(200);
    expect(maxedResponse.json().pagination).toEqual({
      page: 1,
      page_size: 100,
      total_items: 4,
      total_pages: 1
    });
  });

  it('rejects oversized page sizes at the API layer', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/products?page_size=101'
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      type: 'https://product-lookup.dev/problems/invalid-request',
      title: 'Invalid request',
      status: 400,
      detail: 'The request is invalid.',
      instance: '/api/v1/products?page_size=101'
    });
  });
});
