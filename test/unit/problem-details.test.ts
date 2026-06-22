import { describe, expect, it } from 'vitest';

import {
  createProblemDetails,
  createValidationProblemDetails
} from '../../src/errors/problem-details.js';

describe('problem details helpers', () => {
  it('returns the same problem details object', () => {
    const problem = {
      type: 'https://product-lookup.dev/problems/invalid-request',
      title: 'Invalid request',
      status: 400,
      detail: 'The request is invalid.',
      instance: '/api/v1/products'
    };

    expect(createProblemDetails(problem)).toBe(problem);
    expect(createProblemDetails(problem)).toEqual(problem);
  });

  it('returns the same validation problem details object and preserves errors identity', () => {
    const errors = [{ message: 'sku is required' }];
    const problem = {
      type: 'https://product-lookup.dev/problems/invalid-request',
      title: 'Invalid request',
      status: 400,
      detail: 'The request body is invalid.',
      instance: '/api/v1/products',
      errors
    };

    const result = createValidationProblemDetails(problem);

    expect(result).toBe(problem);
    expect(result).toEqual(problem);
    expect(result.errors).toBe(errors);
  });
});
