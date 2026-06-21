import { Type } from '@sinclair/typebox';

import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

const healthResponseSchema = Type.Object(
  {
    status: Type.Literal('ok', {
      description: 'Reports that the service is healthy and ready to respond.',
      examples: ['ok']
    })
  },
  {
    title: 'HealthCheckResponse',
    description: 'Simple service health response.'
  }
);

export const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['health'],
        summary: 'Health check',
        description:
          'Returns a lightweight readiness response for uptime checks and local verification.',
        operationId: 'getHealth',
        response: {
          200: healthResponseSchema
        }
      }
    },
    async () => {
      return { status: 'ok' as const };
    }
  );
};
