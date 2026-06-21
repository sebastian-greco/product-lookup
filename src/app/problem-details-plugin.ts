import type { FastifyPluginAsync } from 'fastify';

import {
  createProblemDetails,
  createValidationProblemDetails
} from '../errors/problem-details.js';
import { ProductNotFoundError } from '../errors/product-not-found-error.js';
import { DuplicateProductSkuError } from '../repositories/products.repository.js';

const invalidRequestType =
  'https://product-lookup.dev/problems/invalid-request';
const duplicateProductSkuType =
  'https://product-lookup.dev/problems/duplicate-product-sku';
const productNotFoundType =
  'https://product-lookup.dev/problems/product-not-found';
const internalServerErrorType =
  'https://product-lookup.dev/problems/internal-server-error';

const problemDetailsPluginSymbol = Symbol.for('skip-override');

const problemDetailsPluginImpl: FastifyPluginAsync = async (app) => {
  app.setNotFoundHandler((request, reply) => {
    const problem = createProblemDetails({
      type: productNotFoundType,
      title: 'Resource not found',
      status: 404,
      detail: `No route matches ${request.method} ${request.url}.`,
      instance: request.url
    });

    return reply.status(problem.status).send(problem);
  });

  app.setErrorHandler((error, request, reply) => {
    if (isValidationError(error)) {
      const problem = createValidationProblemDetails({
        type: invalidRequestType,
        title: 'Invalid request',
        status: 400,
        detail: 'The request is invalid.',
        instance: request.url,
        errors: error.validation
      });

      return reply.status(problem.status).send(problem);
    }

    if (error instanceof DuplicateProductSkuError) {
      const problem = createProblemDetails({
        type: duplicateProductSkuType,
        title: 'Duplicate product SKU',
        status: 409,
        detail: `A product with SKU ${error.sku} already exists.`,
        instance: request.url
      });

      return reply.status(problem.status).send(problem);
    }

    if (error instanceof ProductNotFoundError) {
      const problem = createProblemDetails({
        type: productNotFoundType,
        title: 'Product not found',
        status: 404,
        detail: `Product ${error.productId} was not found.`,
        instance: request.url
      });

      return reply.status(problem.status).send(problem);
    }

    request.log.error({ err: error }, 'request failed');

    const problem = createProblemDetails({
      type: internalServerErrorType,
      title: 'Internal server error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance: request.url
    });

    return reply.status(problem.status).send(problem);
  });
};

export const problemDetailsPlugin = Object.assign(problemDetailsPluginImpl, {
  [problemDetailsPluginSymbol]: true
});

function isValidationError(error: unknown): error is {
  statusCode: number;
  validation: unknown[];
} {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    statusCode?: unknown;
    validation?: unknown;
  };

  return candidate.statusCode === 400 && Array.isArray(candidate.validation);
}
