import { defineConfig } from 'drizzle-kit';

import { loadConfig } from './src/config/env.js';

const config = loadConfig();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: config.databaseUrl
  },
  strict: true,
  verbose: true
});
