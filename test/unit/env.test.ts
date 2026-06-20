import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  it('uses defaults when optional variables are omitted', () => {
    expect(loadConfig({})).toEqual({
      env: 'development',
      host: '0.0.0.0',
      port: 3000,
      logLevel: 'info'
    });
  });

  it('parses valid explicit values', () => {
    expect(
      loadConfig({
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '8080',
        LOG_LEVEL: 'warn'
      })
    ).toEqual({
      env: 'production',
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'warn'
    });
  });

  it('rejects malformed port values', () => {
    expect(() => loadConfig({ PORT: '3000abc' })).toThrow('Invalid PORT');
    expect(() => loadConfig({ PORT: '3000.5' })).toThrow('Invalid PORT');
    expect(() => loadConfig({ PORT: '0' })).toThrow('Invalid PORT');
    expect(() => loadConfig({ PORT: '65536' })).toThrow('Invalid PORT');
  });
});
