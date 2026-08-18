import { Router } from "express";
import { z } from "zod";
import { listEmails, getEmailById, setStarred, setArchived, deleteEmail } from "../services/emailService";
import { validateBody } from "../middleware/validate";

export const emailsRouter = Router();

emailsRouter.get("/", async (req, res, next) => {
  try {
    const status = req.query.status === "sent" ? "sent" : "scheduled";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const result = await listEmails({ status, page, limit, search });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

emailsRouter.get("/:id", async (req, res, next) => {
  try {
    const email = await getEmailById(req.params.id);
    if (!email) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Email not found" } });
      return;
    }
    res.json({ data: email });
  } catch (err) {
    next(err);
  }
});

const starSchema = z.object({ starred: z.boolean() });

emailsRouter.patch("/:id/star", validateBody(starSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing id" } });
      return;
    }
    const email = await setStarred(id, req.body.starred);
    res.json({ data: email });
  } catch (err) {
    next(err);
  }
});

const archiveSchema = z.object({ archived: z.boolean() });

emailsRouter.patch("/:id/archive", validateBody(archiveSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing id" } });
      return;
    }
    const email = await setArchived(id, req.body.archived);
    res.json({ data: email });
  } catch (err) {
    next(err);
  }
});

emailsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing id" } });
      return;
    }
    await deleteEmail(id);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
