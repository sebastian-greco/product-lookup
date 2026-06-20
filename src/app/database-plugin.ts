import type { FastifyPluginAsync } from 'fastify';
import type { Pool } from 'pg';

import { createDatabaseClient, type DatabaseClient } from '../db/client.js';
import { createDatabasePool } from '../db/pool.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseClient;
    dbPool: Pool;
  }
}

export interface DatabasePluginOptions {
  connectionString: string;
}

const databasePluginSymbol = Symbol.for('skip-override');

const databasePluginImpl: FastifyPluginAsync<DatabasePluginOptions> = async (
  app,
  options
) => {
  const pool = createDatabasePool({
    connectionString: options.connectionString
  });

  app.decorate('dbPool', pool);
  app.decorate('db', createDatabaseClient(pool));

  app.addHook('onClose', async () => {
    await pool.end();
  });
};

export const databasePlugin = Object.assign(databasePluginImpl, {
  [databasePluginSymbol]: true
});
