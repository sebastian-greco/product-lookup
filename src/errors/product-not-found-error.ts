import type { ProductId } from '../ids/index.js';

export class ProductNotFoundError extends Error {
  readonly productId: ProductId;

  constructor(productId: ProductId) {
    super(`Product not found: ${productId}`);
    this.name = 'ProductNotFoundError';
    this.productId = productId;
  }
}
