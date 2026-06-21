import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import type { ProductId } from '../ids/index.js';
import {
  createProductBodySchema,
  createProductResponseSchema,
  getProductResponseSchema,
  listProductsQuerySchema,
  listProductsResponseSchema,
  productErrorResponseSchemas,
  productParamsSchema,
  type CreateProductBody,
  type ListProductsQuery,
  type ProductParams
} from '../schemas/products.schemas.js';
import { createProductsRepository } from '../repositories/products.repository.js';
import {
  createProductsService,
  type ListProductsQuery as ListProductsServiceQuery
} from '../services/products.service.js';

export const productsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const repository = createProductsRepository(app.db);
  const productsService = createProductsService(repository);

  app.post(
    '/',
    {
      schema: {
        tags: ['products'],
        summary: 'Create product',
        description:
          'Creates a new product record and returns the created resource.',
        operationId: 'createProduct',
        body: createProductBodySchema,
        response: {
          201: createProductResponseSchema,
          400: productErrorResponseSchemas[400],
          409: productErrorResponseSchemas[409],
          500: productErrorResponseSchemas[500]
        }
      }
    },
    async (request, reply) => {
      const product = await productsService.createProduct(
        request.body as CreateProductBody
      );

      return reply.status(201).send(product);
    }
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['products'],
        summary: 'Get product by id',
        description:
          'Returns a single product by its prefixed product identifier.',
        operationId: 'getProductById',
        params: productParamsSchema,
        response: {
          200: getProductResponseSchema,
          400: productErrorResponseSchemas[400],
          404: productErrorResponseSchemas[404],
          500: productErrorResponseSchemas[500]
        }
      }
    },
    async (request) => {
      const { id } = request.params as ProductParams & { id: ProductId };

      return productsService.getProductById(id);
    }
  );

  app.get(
    '/',
    {
      schema: {
        tags: ['products'],
        summary: 'List products',
        description:
          'Returns a paginated list of products with optional category, status, and search filters.',
        operationId: 'listProducts',
        querystring: listProductsQuerySchema,
        response: {
          200: listProductsResponseSchema,
          400: productErrorResponseSchemas[400],
          500: productErrorResponseSchemas[500]
        }
      }
    },
    async (request) => {
      const query = request.query as ListProductsQuery;
      const listQuery: ListProductsServiceQuery = {
        page: query.page ?? 1,
        pageSize: query.page_size ?? 20,
        ...(query.category !== undefined ? { category: query.category } : {}),
        ...(query.status !== undefined ? { status: query.status } : {}),
        ...(query.search !== undefined ? { search: query.search } : {})
      };

      return productsService.listProducts(listQuery);
    }
  );
};
