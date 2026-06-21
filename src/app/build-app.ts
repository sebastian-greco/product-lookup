import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify from 'fastify';
import type { FastifyServerOptions } from 'fastify';

import type { AppConfig } from '../config/env.js';

import { databasePlugin } from './database-plugin.js';
import { createLoggerOptions } from './logger.js';
import { openApiPlugin } from './open-api-plugin.js';
import { problemDetailsPlugin } from './problem-details-plugin.js';
import { registerRoutes } from './register-routes.js';

export function buildApp(config: AppConfig) {
  const options: FastifyServerOptions = {
    logger: createLoggerOptions(config)
  };

  const app = Fastify(options).withTypeProvider<TypeBoxTypeProvider>();

  app.register(databasePlugin, {
    connectionString: config.databaseUrl
  });

  app.register(problemDetailsPlugin);

  app.register(openApiPlugin);

  app.register(registerRoutes);

  return app;
}
