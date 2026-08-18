export interface EmailJobData {
  emailId: string;
}

export interface AuthenticatedUser {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}
