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
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});
