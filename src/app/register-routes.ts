import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { healthRoutes } from '../routes/health.routes.js';
import { productsRoutes } from '../routes/products.routes.js';

export const registerRoutes: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(healthRoutes);
  await app.register(productsRoutes, {
    prefix: '/api/v1/products'
  });
};
