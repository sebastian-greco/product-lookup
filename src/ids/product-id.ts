import { randomBytes } from 'node:crypto';

const PRODUCT_ID_PREFIX = 'prd_';
const ULID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PRODUCT_ID_BODY_LENGTH = 26;
const PRODUCT_ID_TIME_LENGTH = 10;
const PRODUCT_ID_RANDOM_LENGTH = 16;

export type ProductId = `${typeof PRODUCT_ID_PREFIX}${string}`;

export const productIdPattern = /^prd_[0-9A-HJKMNP-TV-Z]{26}$/;

export function createProductId(now = Date.now()): ProductId {
  return `${PRODUCT_ID_PREFIX}${encodeTime(now)}${encodeRandom()}`;
}

export function isProductId(value: string): value is ProductId {
  return productIdPattern.test(value);
}

function encodeTime(input: number): string {
  if (!Number.isInteger(input) || input < 0 || input > 0xffffffffffff) {
    throw new RangeError('Product ID timestamp must be a 48-bit integer.');
  }

  let value = input;
  let output = '';

  for (let index = 0; index < PRODUCT_ID_TIME_LENGTH; index += 1) {
    output = ULID_ALPHABET[value % 32] + output;
    value = Math.floor(value / 32);
  }

  return output;
}

function encodeRandom(): string {
  const bytes = randomBytes(10);
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  let output = '';

  for (let index = 0; index < PRODUCT_ID_RANDOM_LENGTH; index += 1) {
    output = ULID_ALPHABET[Number(value & 31n)] + output;
    value >>= 5n;
  }

  return output;
}

export const productIdBodyLength = PRODUCT_ID_BODY_LENGTH;
