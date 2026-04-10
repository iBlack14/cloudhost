import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export interface ImpersonationTokenPayload {
  userId: string;
  username: string;
  role: "user";
  accountId: string;
  impersonatedBy: string;
  tokenType: "impersonation";
}

export const signImpersonationToken = (payload: ImpersonationTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.IMPERSONATE_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
};
