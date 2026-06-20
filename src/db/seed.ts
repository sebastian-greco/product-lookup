import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import { loadConfig } from '../config/env.js';
import { productsTable } from './schema/index.js';
import { productSeeds } from './seeds/products.seed.js';

const { databaseUrl } = loadConfig();
const pool = new Pool({ connectionString: databaseUrl });

try {
  const db = drizzle(pool);

  await db.transaction(async (tx) => {
    await tx.delete(productsTable);
    await tx.insert(productsTable).values(productSeeds);
  });
} finally {
  await pool.end();
}
