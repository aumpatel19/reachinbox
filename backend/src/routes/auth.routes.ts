import { Router } from "express";
import type { User } from "@prisma/client";
import { passport } from "../auth/passport";
import { env } from "../config/env";
import { requireAuth } from "../auth/requireAuth";

export const authRouter = Router();

authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${env.FRONTEND_URL}/login?error=1` }),
  (req, res) => {
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  },
);

export const apiAuthRouter = Router();

apiAuthRouter.get("/me", requireAuth, (req, res) => {
  const user = req.user as User;
  res.json({ data: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
});

apiAuthRouter.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      next(err);
      return;
    }
    res.json({ data: { ok: true } });
  });
});
