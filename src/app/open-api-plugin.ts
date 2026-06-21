import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { FastifyPluginAsync } from 'fastify';

const openApiPluginSymbol = Symbol.for('skip-override');

const openApiPluginImpl: FastifyPluginAsync = async (app) => {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'product-lookup API',
        version: '0.1.0'
      }
    }
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    transformSpecificationClone: true,
    transformSpecification: () => app.swagger()
  });
};

export const openApiPlugin = Object.assign(openApiPluginImpl, {
  [openApiPluginSymbol]: true
});
