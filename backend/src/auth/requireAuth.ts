import type { NextFunction, Request, Response } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required" } });
    return;
  }
  next();
}
