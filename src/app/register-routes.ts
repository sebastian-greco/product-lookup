import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { healthRoutes } from '../routes/health.routes.js';

export const registerRoutes: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(healthRoutes);
};
