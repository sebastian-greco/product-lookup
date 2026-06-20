import { buildApp } from './app/build-app.js';
import { loadConfig } from './config/env.js';

const config = loadConfig();
const app = buildApp(config);

try {
  const address = await app.listen({
    host: config.host,
    port: config.port
  });

  app.log.info(
    {
      address,
      env: config.env,
      host: config.host,
      port: config.port
    },
    'server started'
  );
} catch (error) {
  app.log.error({ err: error }, 'server failed to start');

  await app.close();
  process.exit(1);
}
