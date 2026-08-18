import { Router } from "express";
import { z } from "zod";
import {
  listEmails,
  getEmailById,
  setStarred,
  setArchived,
  setDeleted,
  permanentlyDeleteEmail,
  type Folder,
} from "../services/emailService";
import { validateBody } from "../middleware/validate";

export const emailsRouter = Router();

const FOLDERS: Folder[] = ["scheduled", "sent", "archived", "deleted"];

emailsRouter.get("/", async (req, res, next) => {
  try {
    const status: Folder = FOLDERS.includes(req.query.status as Folder)
      ? (req.query.status as Folder)
      : "scheduled";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const sortBy =
      req.query.sortBy === "subject" || req.query.sortBy === "recipient" ? req.query.sortBy : "date";
    const sortDir = req.query.sortDir === "asc" || req.query.sortDir === "desc" ? req.query.sortDir : undefined;

    const result = await listEmails({ status, page, limit, search, sortBy, sortDir });
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

const trashSchema = z.object({ deleted: z.boolean() });

emailsRouter.patch("/:id/trash", validateBody(trashSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "Missing id" } });
      return;
    }
    const email = await setDeleted(id, req.body.deleted);
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
    await permanentlyDeleteEmail(id);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
