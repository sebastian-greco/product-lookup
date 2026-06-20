import { and, asc, eq, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../db/client.js';
import { type ProductStatus, productsTable } from '../db/schema/index.js';
import { createProductId, type ProductId } from '../ids/index.js';

type ProductRow = typeof productsTable.$inferSelect;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const productRecordSelection = {
  id: productsTable.id,
  sku: productsTable.sku,
  name: productsTable.name,
  description: productsTable.description,
  category: productsTable.category,
  price: productsTable.price,
  currency: productsTable.currency,
  status: productsTable.status,
  createdAt: productsTable.createdAt,
  updatedAt: productsTable.updatedAt
};

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
  page?: number;
  pageSize?: number;
  category?: string;
  status?: ProductStatus;
  search?: string;
}

export interface ListProductsResult {
  items: ProductRecord[];
  totalCount: number;
}

interface NormalizedListProductsOptions {
  page: number;
  pageSize: number;
  category?: string;
  status?: ProductStatus;
  search?: string;
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
          .returning(productRecordSelection);

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
        .select(productRecordSelection)
        .from(productsTable)
        .where(eq(productsTable.id, id));

      return product === undefined ? null : toProductRecord(product);
    },

    async list(options) {
      const normalizedOptions = normalizeListOptions(options);
      const whereClause = buildListWhereClause(normalizedOptions);
      const offset =
        (normalizedOptions.page - 1) * normalizedOptions.pageSize;

      const [items, totalRows] = await Promise.all([
        db
          .select(productRecordSelection)
          .from(productsTable)
          .where(whereClause)
          .orderBy(asc(productsTable.name), asc(productsTable.id))
          .limit(normalizedOptions.pageSize)
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

function normalizeListOptions(
  options: ListProductsOptions
): NormalizedListProductsOptions {
  const normalized: NormalizedListProductsOptions = {
    page: normalizePage(options.page),
    pageSize: normalizePageSize(options.pageSize)
  };

  if (options.category !== undefined) {
    normalized.category = options.category;
  }

  if (options.status !== undefined) {
    normalized.status = options.status;
  }

  const normalizedSearch = normalizeSearch(options.search);

  if (normalizedSearch !== undefined) {
    normalized.search = normalizedSearch;
  }

  return normalized;
}

function normalizePage(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 1) {
    return DEFAULT_PAGE;
  }

  return value;
}

function normalizePageSize(value: number | undefined): number {
  if (!Number.isInteger(value) || value === undefined || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(value, MAX_PAGE_SIZE);
}

function normalizeSearch(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === '' ? undefined : normalized;
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
