import type { FastifyServerOptions } from 'fastify';

import type { AppConfig } from '../config/env.js';

type LoggerOptions = Exclude<
  FastifyServerOptions['logger'],
  boolean | undefined
>;

export function createLoggerOptions(config: AppConfig): LoggerOptions {
  if (config.env === 'development') {
    return {
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    };
  }

  return {
    level: config.logLevel
  };
}
