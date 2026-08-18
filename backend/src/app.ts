import express from "express";
import cors from "cors";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { env } from "./config/env";
import { sessionMiddleware } from "./auth/session";
import { passport } from "./auth/passport";
import { requireAuth } from "./auth/requireAuth";
import { authRouter, apiAuthRouter } from "./routes/auth.routes";
import { sendersRouter } from "./routes/senders.routes";
import { campaignsRouter } from "./routes/campaigns.routes";
import { emailsRouter } from "./routes/emails.routes";
import { healthRouter } from "./routes/health.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { emailQueue } from "./queue/emailQueue";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use("/auth", authRouter);
  app.use("/api/auth", apiAuthRouter);
  app.use("/api/senders", requireAuth, sendersRouter);
  app.use("/api/campaigns", requireAuth, campaignsRouter);
  app.use("/api/emails", requireAuth, emailsRouter);
  app.use("/api/health", healthRouter);

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({
    queues: [new BullMQAdapter(emailQueue) as unknown as Parameters<typeof createBullBoard>[0]["queues"][number]],
    serverAdapter,
  });
  app.use("/admin/queues", requireAuth, serverAdapter.getRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
