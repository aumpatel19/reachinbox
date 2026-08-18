import { Router } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../db/prisma";
import { createCampaign, createCampaignSchema } from "../services/campaignService";
import { validateBody } from "../middleware/validate";

export const campaignsRouter = Router();

campaignsRouter.post("/", validateBody(createCampaignSchema), async (req, res, next) => {
  try {
    const user = req.user as User;
    const result = await createCampaign(user.id, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

campaignsRouter.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { emails: true } } },
      }),
      prisma.campaign.count(),
    ]);

    res.json({ data: { items: campaigns, total, page, limit } });
  } catch (err) {
    next(err);
  }
});
