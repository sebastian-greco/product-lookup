import { afterEach, describe, expect, it } from 'vitest';

import type { FastifyInstance } from 'fastify';

import { buildTestApp } from '../helpers/build-test-app.js';

describe('OpenAPI documentation surface', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('serves Swagger UI and generated YAML documentation', async () => {
    app = buildTestApp();

    await app.ready();

    const uiResponse = await app.inject({
      method: 'GET',
      url: '/documentation/'
    });

    expect(uiResponse.statusCode).toBe(200);
    expect(uiResponse.headers['content-type']).toContain('text/html');
    expect(uiResponse.body).toContain('Swagger UI');

    const yamlResponse = await app.inject({
      method: 'GET',
      url: '/documentation/yaml'
    });

    expect(yamlResponse.statusCode).toBe(200);
    expect(yamlResponse.headers['content-type']).toContain('yaml');
    expect(yamlResponse.body).toContain('openapi: 3.0.3');
    expect(yamlResponse.body).toContain('/api/v1/products/');
    expect(yamlResponse.body).toContain('/health:');
  });

  it('includes the implemented routes in the generated OpenAPI document', async () => {
    app = buildTestApp();

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');

    const document = response.json();

    expect(document.openapi).toBe('3.0.3');
    expect(document.info).toMatchObject({
      title: 'product-lookup API',
      version: '0.1.0'
    });
    expect(document.paths).toMatchObject({
      '/health': {
        get: expect.objectContaining({
          operationId: 'getHealth'
        })
      },
      '/api/v1/products/': {
        get: expect.objectContaining({
          operationId: 'listProducts'
        }),
        post: expect.objectContaining({
          operationId: 'createProduct'
        })
      },
      '/api/v1/products/{id}': {
        get: expect.objectContaining({
          operationId: 'getProductById'
        })
      }
    });
  });
});
