import type { ProductStatus } from '../db/schema/index.js';
import { ProductNotFoundError } from '../errors/product-not-found-error.js';
import type { ProductId } from '../ids/index.js';
import type {
  CreateProductInput,
  ListProductsOptions,
  ProductRecord,
  ProductsRepository
} from '../repositories/products.repository.js';

export interface CreateProductCommand {
  sku: string;
  name: string;
  description?: string;
  category: string;
  price: string;
  currency: string;
  status?: ProductStatus;
}

export interface ListProductsQuery {
  page: number;
  pageSize: number;
  category?: string;
  status?: ProductStatus;
  search?: string;
}

export interface ProductView {
  id: ProductId;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: string;
  currency: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface ListProductsView {
  data: ProductView[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface ProductsService {
  createProduct(command: CreateProductCommand): Promise<ProductView>;
  getProductById(productId: ProductId): Promise<ProductView>;
  listProducts(query: ListProductsQuery): Promise<ListProductsView>;
}

export function createProductsService(
  repository: ProductsRepository
): ProductsService {
  return {
    async createProduct(command) {
      const created = await repository.create(toCreateProductInput(command));

      return toProductView(created);
    },

    async getProductById(productId) {
      const product = await repository.findById(productId);

      if (product === null) {
        throw new ProductNotFoundError(productId);
      }

      return toProductView(product);
    },

    async listProducts(query) {
      const result = await repository.list(toListProductsOptions(query));

      return {
        data: result.items.map(toProductView),
        pagination: {
          page: query.page,
          page_size: query.pageSize,
          total_items: result.totalCount,
          total_pages: calculateTotalPages(result.totalCount, query.pageSize)
        }
      };
    }
  };
}

function toCreateProductInput(
  command: CreateProductCommand
): CreateProductInput {
  const input: CreateProductInput = {
    sku: command.sku,
    name: command.name,
    category: command.category,
    price: command.price,
    currency: command.currency
  };

  if (command.description !== undefined) {
    input.description = command.description;
  }

  if (command.status !== undefined) {
    input.status = command.status;
  }

  return input;
}

function toListProductsOptions(query: ListProductsQuery): ListProductsOptions {
  const options: ListProductsOptions = {
    page: query.page,
    pageSize: query.pageSize
  };

  if (query.category !== undefined) {
    options.category = query.category;
  }

  if (query.status !== undefined) {
    options.status = query.status;
  }

  if (query.search !== undefined) {
    options.search = query.search;
  }

  return options;
}

function toProductView(product: ProductRecord): ProductView {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    currency: product.currency,
    status: product.status,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString()
  };
}

function calculateTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems === 0) {
    return 0;
  }

  return Math.ceil(totalItems / pageSize);
}
