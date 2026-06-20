import { and, asc, eq, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../db/client.js';
import { type ProductStatus, productsTable } from '../db/schema/index.js';
import { createProductId, type ProductId } from '../ids/index.js';

type ProductRow = typeof productsTable.$inferSelect;

export type ProductRecord = Omit<ProductRow, 'id'> & {
  id: ProductId;
};

type NewProductRecord = typeof productsTable.$inferInsert;

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  currency: string;
  status?: ProductStatus;
}

export interface ListProductsOptions {
  page: number;
  pageSize: number;
  category?: string;
  status?: ProductStatus;
  search?: string;
}

export interface ListProductsResult {
  items: ProductRecord[];
  totalCount: number;
}

export interface ProductsRepository {
  create(input: CreateProductInput): Promise<ProductRecord>;
  findById(id: ProductId): Promise<ProductRecord | null>;
  list(options: ListProductsOptions): Promise<ListProductsResult>;
}

export class DuplicateProductSkuError extends Error {
  readonly sku: string;

  constructor(sku: string) {
    super(`Product SKU already exists: ${sku}`);
    this.name = 'DuplicateProductSkuError';
    this.sku = sku;
  }
}

export function createProductsRepository(
  db: DatabaseClient
): ProductsRepository {
  return {
    async create(input) {
      const values: NewProductRecord = {
        id: createProductId(),
        sku: input.sku,
        name: input.name,
        category: input.category,
        price: input.price,
        currency: input.currency
      };

      if (input.description !== undefined) {
        values.description = input.description;
      }

      if (input.status !== undefined) {
        values.status = input.status;
      }

      try {
        const [product] = await db
          .insert(productsTable)
          .values(values)
          .returning();

        if (product === undefined) {
          throw new Error('Failed to create product record.');
        }

        return toProductRecord(product);
      } catch (error) {
        if (isDuplicateSkuViolation(error)) {
          throw new DuplicateProductSkuError(input.sku);
        }

        throw error;
      }
    },

    async findById(id) {
      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, id));

      return product === undefined ? null : toProductRecord(product);
    },

    async list(options) {
      const whereClause = buildListWhereClause(options);
      const offset = (options.page - 1) * options.pageSize;

      const [items, totalRows] = await Promise.all([
        db
          .select()
          .from(productsTable)
          .where(whereClause)
          .orderBy(asc(productsTable.name), asc(productsTable.id))
          .limit(options.pageSize)
          .offset(offset),
        db
          .select({ totalCount: sql<number>`count(*)::int` })
          .from(productsTable)
          .where(whereClause)
      ]);

      return {
        items: items.map(toProductRecord),
        totalCount: totalRows[0]?.totalCount ?? 0
      };
    }
  };
}

function buildListWhereClause(options: ListProductsOptions) {
  const filters = [];

  if (options.category !== undefined) {
    filters.push(eq(productsTable.category, options.category));
  }

  if (options.status !== undefined) {
    filters.push(eq(productsTable.status, options.status));
  }

  if (options.search !== undefined) {
    filters.push(sql`${productsTable.name} ILIKE ${`%${options.search}%`}`);
  }

  if (filters.length === 0) {
    return undefined;
  }

  return and(...filters);
}

function isDuplicateSkuViolation(error: unknown): error is {
  code: string;
  constraint?: string;
} {
  return findPostgresError(error)?.constraint === 'products_sku_unique_idx';
}

function findPostgresError(error: unknown):
  | {
      code: string;
      constraint?: string;
    }
  | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
  };

  if (candidate.code === '23505') {
    const postgresError: {
      code: string;
      constraint?: string;
    } = {
      code: candidate.code
    };

    if (typeof candidate.constraint === 'string') {
      postgresError.constraint = candidate.constraint;
    }

    return postgresError;
  }

  return findPostgresError(candidate.cause);
}

function toProductRecord(product: ProductRow): ProductRecord {
  return product as ProductRecord;
}
