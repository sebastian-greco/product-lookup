import { Type, type Static } from '@sinclair/typebox';

import { productStatuses } from '../db/schema/index.js';
import { productIdPattern } from '../ids/index.js';

import {
  problemDetailsSchema,
  validationProblemDetailsSchema
} from './problem-details.schemas.js';

const pageMinimum = 1;
const defaultPage = 1;
const defaultPageSize = 20;
const maxPageSize = 100;
const productIdExample = 'prd_01J00000000000000000000000';

const productStatusSchema = Type.Union(
  productStatuses.map((status) => Type.Literal(status)),
  {
    description: 'Lifecycle status for the product.',
    examples: ['ACTIVE']
  }
);

export const productParamsSchema = Type.Object(
  {
    id: Type.String({
      pattern: productIdPattern.source,
      description: 'Prefixed product identifier.',
      examples: [productIdExample]
    })
  },
  {
    title: 'ProductParams',
    description: 'Path parameters for product routes.'
  }
);

export const createProductBodySchema = Type.Object(
  {
    sku: Type.String({
      minLength: 1,
      maxLength: 64,
      description: 'Stock keeping unit that uniquely identifies the product.',
      examples: ['SKU-POST-001']
    }),
    name: Type.String({
      minLength: 1,
      maxLength: 255,
      description: 'Customer-facing product name.',
      examples: ['Launch Phone']
    }),
    description: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 10_000,
        description: 'Optional long-form product description.',
        examples: ['256GB graphite']
      })
    ),
    category: Type.String({
      minLength: 1,
      maxLength: 128,
      description: 'Product category used for organization and filtering.',
      examples: ['Electronics']
    }),
    price: Type.String({
      pattern: '^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$',
      description:
        'Decimal price represented as a string with up to two fraction digits.',
      examples: ['1099.99']
    }),
    currency: Type.String({
      pattern: '^[A-Z]{3}$',
      description: 'ISO 4217 currency code.',
      examples: ['EUR']
    }),
    status: Type.Optional(productStatusSchema)
  },
  {
    title: 'CreateProductRequest',
    description: 'Request body used to create a product.'
  }
);

export const listProductsQuerySchema = Type.Object(
  {
    page: Type.Optional(
      Type.Integer({
        minimum: pageMinimum,
        default: defaultPage,
        description: '1-based page number.',
        examples: [1]
      })
    ),
    page_size: Type.Optional(
      Type.Integer({
        minimum: pageMinimum,
        maximum: maxPageSize,
        default: defaultPageSize,
        description: 'Number of products returned per page.',
        examples: [20]
      })
    ),
    category: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 128,
        description: 'Filter products by exact category.',
        examples: ['Electronics']
      })
    ),
    status: Type.Optional(productStatusSchema),
    search: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: 255,
        description:
          'Case-insensitive substring match against product name or SKU.',
        examples: ['iphone']
      })
    )
  },
  {
    title: 'ListProductsQuery',
    description: 'Query parameters for paginated product listing.'
  }
);

export const productResponseSchema = Type.Object(
  {
    id: Type.String({
      pattern: productIdPattern.source,
      description: 'Prefixed product identifier.',
      examples: [productIdExample]
    }),
    sku: Type.String({
      description: 'Stock keeping unit for the product.',
      examples: ['SKU-POST-001']
    }),
    name: Type.String({
      description: 'Customer-facing product name.',
      examples: ['Launch Phone']
    }),
    description: Type.Union(
      [Type.String({ examples: ['256GB graphite'] }), Type.Null()],
      {
        description: 'Optional long-form product description.'
      }
    ),
    category: Type.String({
      description: 'Product category.',
      examples: ['Electronics']
    }),
    price: Type.String({
      description: 'Decimal price represented as a string.',
      examples: ['1099.99']
    }),
    currency: Type.String({
      description: 'ISO 4217 currency code.',
      examples: ['EUR']
    }),
    status: productStatusSchema,
    created_at: Type.String({
      format: 'date-time',
      description: 'Timestamp when the product was created.',
      examples: ['2026-06-21T12:00:00.000Z']
    }),
    updated_at: Type.String({
      format: 'date-time',
      description: 'Timestamp when the product was last updated.',
      examples: ['2026-06-21T12:00:00.000Z']
    })
  },
  {
    title: 'Product',
    description: 'Product resource returned by the API.'
  }
);

export const listProductsResponseSchema = Type.Object(
  {
    data: Type.Array(productResponseSchema),
    pagination: Type.Object(
      {
        page: Type.Integer({
          minimum: pageMinimum,
          description: 'Current page number.',
          examples: [1]
        }),
        page_size: Type.Integer({
          minimum: pageMinimum,
          description: 'Number of items returned per page.',
          examples: [20]
        }),
        total_items: Type.Integer({
          minimum: 0,
          description: 'Total number of matching products.',
          examples: [42]
        }),
        total_pages: Type.Integer({
          minimum: 0,
          description: 'Total number of available pages.',
          examples: [3]
        })
      },
      {
        title: 'PaginationMetadata',
        description: 'Pagination metadata for a list response.'
      }
    )
  },
  {
    title: 'ListProductsResponse',
    description: 'Paginated list of products.'
  }
);

export const createProductResponseSchema = productResponseSchema;
export const getProductResponseSchema = productResponseSchema;
export const productErrorResponseSchemas = {
  400: validationProblemDetailsSchema,
  404: problemDetailsSchema,
  409: problemDetailsSchema,
  500: problemDetailsSchema
};

export type CreateProductBody = Static<typeof createProductBodySchema>;
export type ProductParams = Static<typeof productParamsSchema>;
export type ListProductsQuery = Static<typeof listProductsQuerySchema>;
export type ProductResponse = Static<typeof productResponseSchema>;
export type ListProductsResponse = Static<typeof listProductsResponseSchema>;
