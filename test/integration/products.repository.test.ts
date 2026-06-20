import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { FastifyInstance } from 'fastify';

import { productsTable } from '../../src/db/schema/index.js';
import { isProductId, type ProductId } from '../../src/ids/index.js';
import {
  createProductsRepository,
  DuplicateProductSkuError
} from '../../src/repositories/products.repository.js';
import { buildTestApp } from '../helpers/build-test-app.js';

describe('products repository', () => {
  let app: FastifyInstance;
  const productInput = {
    sku: 'SKU-001',
    name: 'Alpha Phone',
    description: '128GB black',
    category: 'Electronics',
    price: 999.99,
    currency: 'EUR'
  };

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

  it('creates a product with a generated product ID and default status', async () => {
    const repository = createProductsRepository(app.db);

    const product = await repository.create(productInput);

    expect(isProductId(product.id)).toBe(true);
    expect(product).toMatchObject({
      ...productInput,
      status: 'ACTIVE'
    });
    expect(product.createdAt).toBeInstanceOf(Date);
    expect(product.updatedAt).toBeInstanceOf(Date);
  });

  it('finds a product by ID and returns null for a missing product', async () => {
    const repository = createProductsRepository(app.db);
    const created = await repository.create(productInput);

    await expect(
      repository.findById(created.id as ProductId)
    ).resolves.toMatchObject({
      id: created.id,
      sku: productInput.sku,
      name: productInput.name
    });

    await expect(
      repository.findById('prd_01J0000000000000000000000' as ProductId)
    ).resolves.toBeNull();
  });

  it('raises a repository error when a product SKU already exists', async () => {
    const repository = createProductsRepository(app.db);

    await repository.create(productInput);

    await expect(repository.create(productInput)).rejects.toBeInstanceOf(
      DuplicateProductSkuError
    );
  });

  it('lists products with filters, pagination, case-insensitive search, and total count', async () => {
    const repository = createProductsRepository(app.db);

    await repository.create({
      sku: 'SKU-101',
      name: 'Alpha iPhone',
      category: 'Electronics',
      price: 899.99,
      currency: 'EUR'
    });
    await repository.create({
      sku: 'SKU-102',
      name: 'Bravo iPhone',
      category: 'Electronics',
      price: 949.99,
      currency: 'EUR'
    });
    await repository.create({
      sku: 'SKU-103',
      name: 'Charlie iPhone',
      category: 'Electronics',
      price: 999.99,
      currency: 'EUR'
    });
    await repository.create({
      sku: 'SKU-104',
      name: 'Delta iPhone',
      category: 'Electronics',
      price: 799.99,
      currency: 'EUR',
      status: 'INACTIVE'
    });
    await repository.create({
      sku: 'SKU-105',
      name: 'Office Chair',
      category: 'Furniture',
      price: 199.99,
      currency: 'EUR'
    });

    const firstPage = await repository.list({
      page: 1,
      pageSize: 2,
      category: 'Electronics',
      status: 'ACTIVE',
      search: 'IPHONE'
    });

    expect(firstPage.totalCount).toBe(3);
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items.map((item) => item.name)).toEqual([
      'Alpha iPhone',
      'Bravo iPhone'
    ]);

    const secondPage = await repository.list({
      page: 2,
      pageSize: 2,
      category: 'Electronics',
      status: 'ACTIVE',
      search: 'IPHONE'
    });

    expect(secondPage.totalCount).toBe(3);
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.name).toBe('Charlie iPhone');
  });
});
