import { describe, expect, it } from 'vitest';

import {
  createProductId,
  isProductId,
  productIdBodyLength,
  productIdPattern
} from '../../src/ids/product-id.js';

describe('product IDs', () => {
  it('creates a prd_-prefixed ULID-shaped identifier', () => {
    const productId = createProductId();

    expect(productId).toMatch(productIdPattern);
    expect(productId).toHaveLength(4 + productIdBodyLength);
  });

  it('creates different identifiers across calls', () => {
    expect(createProductId()).not.toBe(createProductId());
  });

  it('accepts valid product IDs and rejects invalid values', () => {
    expect(isProductId('prd_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(true);
    expect(isProductId('usr_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(false);
    expect(isProductId('prd_01ARZ3NDEKTSV4RRFFQ69G5FA')).toBe(false);
    expect(isProductId('prd_01ARZ3NDEKTSV4RRFFQ69G5FAI')).toBe(false);
    expect(isProductId('prd_01ARZ3NDEKTSV4RRFFQ69G5FAU')).toBe(false);
    expect(isProductId('PRD_01ARZ3NDEKTSV4RRFFQ69G5FAV')).toBe(false);
  });

  it('rejects timestamps outside the ULID range', () => {
    expect(() => createProductId(-1)).toThrow(
      'Product ID timestamp must be a 48-bit integer.'
    );
    expect(() => createProductId(0x1000000000000)).toThrow(
      'Product ID timestamp must be a 48-bit integer.'
    );
  });
});
