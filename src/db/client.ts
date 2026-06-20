import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import * as schema from './schema/index.js';

export type DatabaseClient = NodePgDatabase<typeof schema>;

export function createDatabaseClient(pool: Pool): DatabaseClient {
  return drizzle(pool, { schema });
}
