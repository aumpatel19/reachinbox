import { Router } from "express";
import type { User } from "@prisma/client";
import { z } from "zod";
import { listSenders, createEtherealSender } from "../services/senderService";
import { validateBody } from "../middleware/validate";

export const sendersRouter = Router();

sendersRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ data: await listSenders() });
  } catch (err) {
    next(err);
  }
});

const createEtherealSchema = z.object({ name: z.string().min(1).max(100).optional() });

sendersRouter.post("/ethereal", validateBody(createEtherealSchema), async (req, res, next) => {
  try {
    const user = req.user as User;
    const sender = await createEtherealSender(user.id, req.body.name);
    res.status(201).json({ data: sender });
  } catch (err) {
    next(err);
  }
});
