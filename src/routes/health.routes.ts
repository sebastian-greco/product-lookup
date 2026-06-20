import { Type } from '@sinclair/typebox';

import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

export const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        response: {
          200: Type.Object({
            status: Type.Literal('ok')
          })
        }
      }
    },
    async () => {
      return { status: 'ok' as const };
    }
  );
};
