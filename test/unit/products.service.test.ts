import { describe, expect, it } from 'vitest';

import { ProductNotFoundError } from '../../src/errors/product-not-found-error.js';
import { createProductsService } from '../../src/services/products.service.js';
import type {
  CreateProductInput,
  ListProductsOptions,
  ProductRecord,
  ProductsRepository
} from '../../src/repositories/products.repository.js';

describe('createProductsService', () => {
  it('maps create input and returns a product view', async () => {
    const createdAt = new Date('2026-06-22T10:00:00.000Z');
    const updatedAt = new Date('2026-06-22T11:00:00.000Z');
    let receivedInput: CreateProductInput | undefined;

    const repository: ProductsRepository = {
      async create(input) {
        receivedInput = input;

        return createProductRecord({
          sku: input.sku,
          name: input.name,
          description: input.description ?? null,
          category: input.category,
          price: input.price,
          currency: input.currency,
          status: input.status ?? 'ACTIVE',
          createdAt,
          updatedAt
        });
      },
      async findById() {
        throw new Error('not used');
      },
      async list() {
        throw new Error('not used');
      }
    };

    const service = createProductsService(repository);

    await expect(
      service.createProduct({
        sku: 'SKU-123',
        name: 'Travel Mug',
        description: 'Keeps drinks warm',
        category: 'Kitchen',
        price: '24.99',
        currency: 'USD',
        status: 'INACTIVE'
      })
    ).resolves.toEqual({
      id: 'prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
      sku: 'SKU-123',
      name: 'Travel Mug',
      description: 'Keeps drinks warm',
      category: 'Kitchen',
      price: '24.99',
      currency: 'USD',
      status: 'INACTIVE',
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString()
    });

    expect(receivedInput).toEqual({
      sku: 'SKU-123',
      name: 'Travel Mug',
      description: 'Keeps drinks warm',
      category: 'Kitchen',
      price: '24.99',
      currency: 'USD',
      status: 'INACTIVE'
    });
  });

  it('throws ProductNotFoundError when the repository returns null', async () => {
    const repository: ProductsRepository = {
      async create() {
        throw new Error('not used');
      },
      async findById() {
        return null;
      },
      async list() {
        throw new Error('not used');
      }
    };

    const service = createProductsService(repository);
    const productId = 'prd_01ARZ3NDEKTSV4RRFFQ69G5FAV';

    await expect(service.getProductById(productId)).rejects.toMatchObject({
      name: 'ProductNotFoundError',
      message: `Product not found: ${productId}`,
      productId
    });
    await expect(service.getProductById(productId)).rejects.toBeInstanceOf(
      ProductNotFoundError
    );
  });

  it('maps list results and pagination from a stub repository', async () => {
    const createdAt = new Date('2026-06-22T10:00:00.000Z');
    const updatedAt = new Date('2026-06-22T11:00:00.000Z');
    let receivedOptions: ListProductsOptions | undefined;

    const repository: ProductsRepository = {
      async create() {
        throw new Error('not used');
      },
      async findById() {
        throw new Error('not used');
      },
      async list(options) {
        receivedOptions = options;

        return {
          items: [
            createProductRecord({
              id: 'prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
              sku: 'SKU-100',
              name: 'Desk Lamp',
              description: null,
              category: 'Office',
              price: '49.99',
              currency: 'USD',
              status: 'ACTIVE',
              createdAt,
              updatedAt
            }),
            createProductRecord({
              id: 'prd_01ARZ3NDEKTSV4RRFFQ69G5FAW',
              sku: 'SKU-101',
              name: 'Standing Desk',
              description: 'Walnut finish',
              category: 'Office',
              price: '599.00',
              currency: 'USD',
              status: 'ACTIVE',
              createdAt,
              updatedAt
            })
          ],
          totalCount: 5
        };
      }
    };

    const service = createProductsService(repository);

    await expect(
      service.listProducts({
        page: 2,
        pageSize: 2,
        category: 'Office',
        status: 'ACTIVE',
        search: 'desk'
      })
    ).resolves.toEqual({
      data: [
        {
          id: 'prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          sku: 'SKU-100',
          name: 'Desk Lamp',
          description: null,
          category: 'Office',
          price: '49.99',
          currency: 'USD',
          status: 'ACTIVE',
          created_at: createdAt.toISOString(),
          updated_at: updatedAt.toISOString()
        },
        {
          id: 'prd_01ARZ3NDEKTSV4RRFFQ69G5FAW',
          sku: 'SKU-101',
          name: 'Standing Desk',
          description: 'Walnut finish',
          category: 'Office',
          price: '599.00',
          currency: 'USD',
          status: 'ACTIVE',
          created_at: createdAt.toISOString(),
          updated_at: updatedAt.toISOString()
        }
      ],
      pagination: {
        page: 2,
        page_size: 2,
        total_items: 5,
        total_pages: 3
      }
    });

    expect(receivedOptions).toEqual({
      page: 2,
      pageSize: 2,
      category: 'Office',
      status: 'ACTIVE',
      search: 'desk'
    });
  });
});

function createProductRecord(
  overrides: Partial<ProductRecord> = {}
): ProductRecord {
  return {
    id: 'prd_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    sku: 'SKU-DEFAULT',
    name: 'Default Product',
    description: null,
    category: 'Default Category',
    price: '1.00',
    currency: 'USD',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-22T10:00:00.000Z'),
    updatedAt: new Date('2026-06-22T11:00:00.000Z'),
    ...overrides
  };
}
