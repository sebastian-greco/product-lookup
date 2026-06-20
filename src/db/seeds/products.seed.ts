import type { productsTable } from '../schema/index.js';

type ProductSeed = typeof productsTable.$inferInsert;

const seedTimestamp = new Date('2025-01-01T00:00:00.000Z');

export const productSeeds: ProductSeed[] = [
  {
    id: 'prd_01J00000000000000000000000',
    sku: 'ELEC-IPHONE-001',
    name: 'Alpha Phone',
    description: '128GB black',
    category: 'Electronics',
    price: 999.99,
    currency: 'EUR',
    status: 'ACTIVE',
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  },
  {
    id: 'prd_01J00000000000000000000001',
    sku: 'ELEC-TABLET-001',
    name: 'Bravo Tablet',
    description: '11-inch Wi-Fi',
    category: 'Electronics',
    price: 649.5,
    currency: 'EUR',
    status: 'ACTIVE',
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  },
  {
    id: 'prd_01J00000000000000000000002',
    sku: 'HOME-CHAIR-001',
    name: 'Office Chair',
    description: 'Mesh back ergonomic chair',
    category: 'Furniture',
    price: 199,
    currency: 'EUR',
    status: 'ACTIVE',
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  },
  {
    id: 'prd_01J00000000000000000000003',
    sku: 'HOME-DESK-001',
    name: 'Standing Desk',
    description: 'Electric sit-stand desk',
    category: 'Furniture',
    price: 499,
    currency: 'EUR',
    status: 'INACTIVE',
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  },
  {
    id: 'prd_01J00000000000000000000004',
    sku: 'SPORT-BOTTLE-001',
    name: 'Trail Bottle',
    description: null,
    category: 'Outdoors',
    price: 24.9,
    currency: 'EUR',
    status: 'ACTIVE',
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  }
];
