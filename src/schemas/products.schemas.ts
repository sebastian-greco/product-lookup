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

const productStatusSchema = Type.Union(
  productStatuses.map((status) => Type.Literal(status))
);

export const productParamsSchema = Type.Object({
  id: Type.String({ pattern: productIdPattern.source })
});

export const createProductBodySchema = Type.Object({
  sku: Type.String({ minLength: 1, maxLength: 64 }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String({ minLength: 1, maxLength: 10_000 })),
  category: Type.String({ minLength: 1, maxLength: 128 }),
  price: Type.String({ pattern: '^(?:0|[1-9]\\d*)(?:\\.\\d{1,2})?$' }),
  currency: Type.String({ pattern: '^[A-Z]{3}$' }),
  status: Type.Optional(productStatusSchema)
});

export const listProductsQuerySchema = Type.Object({
  page: Type.Optional(
    Type.Integer({ minimum: pageMinimum, default: defaultPage })
  ),
  page_size: Type.Optional(
    Type.Integer({
      minimum: pageMinimum,
      maximum: maxPageSize,
      default: defaultPageSize
    })
  ),
  category: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
  status: Type.Optional(productStatusSchema),
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 255 }))
});

export const productResponseSchema = Type.Object({
  id: Type.String({ pattern: productIdPattern.source }),
  sku: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  category: Type.String(),
  price: Type.String(),
  currency: Type.String(),
  status: productStatusSchema,
  created_at: Type.String({ format: 'date-time' }),
  updated_at: Type.String({ format: 'date-time' })
});

export const listProductsResponseSchema = Type.Object({
  data: Type.Array(productResponseSchema),
  pagination: Type.Object({
    page: Type.Integer({ minimum: pageMinimum }),
    page_size: Type.Integer({ minimum: pageMinimum }),
    total_items: Type.Integer({ minimum: 0 }),
    total_pages: Type.Integer({ minimum: 0 })
  })
});

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
