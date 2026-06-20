import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { loadConfig } from '../config/env.js';

const { databaseUrl } = loadConfig();
const pool = new Pool({ connectionString: databaseUrl });

try {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle' });
} finally {
  await pool.end();
}
