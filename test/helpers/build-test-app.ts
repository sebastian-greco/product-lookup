import { buildApp } from '../../src/app/build-app.js';
import type { AppConfig } from '../../src/config/env.js';

const defaultTestConfig: AppConfig = {
  env: 'test',
  host: '127.0.0.1',
  port: 0,
  logLevel: 'error'
};

export function buildTestApp(overrides: Partial<AppConfig> = {}) {
  return buildApp({
    ...defaultTestConfig,
    ...overrides
  });
}
