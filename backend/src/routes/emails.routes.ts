import { Router } from "express";
import { listEmails, getEmailById } from "../services/emailService";

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
