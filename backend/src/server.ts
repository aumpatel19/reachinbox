import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { reconcile } from "./queue/reconcile";

async function main() {
  await reconcile();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "API server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "failed to start API server");
  process.exit(1);
});
