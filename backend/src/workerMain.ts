import { env } from "./config/env";
import { logger } from "./config/logger";
import { reconcile } from "./queue/reconcile";
import { startEmailWorker } from "./worker/emailWorker";

async function main() {
  await reconcile();

  const worker = startEmailWorker();
  logger.info({ concurrency: env.WORKER_CONCURRENCY }, "email worker started");

  const shutdown = async () => {
    logger.info("shutting down worker");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "failed to start worker");
  process.exit(1);
});
