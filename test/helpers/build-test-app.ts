import { buildApp } from '../../src/app/build-app.js';
import { loadConfig, type AppConfig } from '../../src/config/env.js';

const defaultTestConfig = loadConfig({
  ...process.env,
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: '1',
  LOG_LEVEL: 'error',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://product_lookup:product_lookup@127.0.0.1:5433/product_lookup'
});

export function buildTestApp(overrides: Partial<AppConfig> = {}) {
  return buildApp({
    ...defaultTestConfig,
    port: 0,
    ...overrides
  });
}
