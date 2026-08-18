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

  // Render (and most PaaS hosts) terminate TLS at a reverse proxy in front
  // of the app -- without this, Express can't tell the request was actually
  // HTTPS, and secure cookies would silently never get set.
  app.set("trust proxy", 1);

  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  // 15mb accommodates base64-encoded email attachments (see campaignService's
  // own tighter per-file/total caps, which produce a clearer 400 than a bare 413).
  app.use(express.json({ limit: "15mb" }));
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
