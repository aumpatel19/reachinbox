import session from "express-session";
import RedisStore from "connect-redis";
import { redis } from "../redis/client";
import { env } from "../config/env";

export const sessionMiddleware = session({
  store: new RedisStore({ client: redis, prefix: "sess:" }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // Frontend (Vercel) and backend (Render) are different origins in
    // production, so the session cookie must be sent cross-site -- that
    // requires sameSite: "none", which in turn requires secure: true
    // (browsers reject SameSite=None cookies over plain HTTP).
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
