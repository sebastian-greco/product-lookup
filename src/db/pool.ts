import { Pool } from 'pg';

export interface DatabasePoolOptions {
  connectionString: string;
}

export function createDatabasePool(options: DatabasePoolOptions): Pool {
  return new Pool({
    connectionString: options.connectionString
  });
}
