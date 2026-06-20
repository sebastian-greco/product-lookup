import { env } from 'node:process';

export type AppEnvironment = 'development' | 'test' | 'production';

export interface AppConfig {
  env: AppEnvironment;
  host: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;
const DEFAULT_LOG_LEVEL: AppConfig['logLevel'] = 'info';

export function loadConfig(source: NodeJS.ProcessEnv = env): AppConfig {
  return {
    env: parseEnvironment(source.NODE_ENV),
    host: source.HOST ?? DEFAULT_HOST,
    port: parsePort(source.PORT),
    logLevel: parseLogLevel(source.LOG_LEVEL)
  };
}

function parseEnvironment(value: string | undefined): AppEnvironment {
  switch (value) {
    case 'development':
    case 'test':
    case 'production':
      return value;
    case undefined:
      return 'development';
    default:
      throw new Error(`Invalid NODE_ENV: ${value}`);
  }
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid PORT: ${value}`);
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT: ${value}`);
  }

  return port;
}

function parseLogLevel(value: string | undefined): AppConfig['logLevel'] {
  switch (value) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      return value;
    case undefined:
      return DEFAULT_LOG_LEVEL;
    default:
      throw new Error(`Invalid LOG_LEVEL: ${value}`);
  }
}
