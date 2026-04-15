import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type AuthRole = "admin" | "reseller" | "user";

export interface ImpersonationTokenPayload {
  userId: string;
  username: string;
  role: "user";
  accountId: string;
  impersonatedBy: string;
  tokenType: "impersonation";
}

export interface AccessTokenPayload {
  userId: string;
  username: string;
  role: AuthRole;
  tokenType: "access";
}

export type AuthTokenPayload = AccessTokenPayload | ImpersonationTokenPayload;

export const signImpersonationToken = (payload: ImpersonationTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.IMPERSONATE_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
};

export const signAccessToken = (
  payload: AccessTokenPayload,
  expiresIn: jwt.SignOptions["expiresIn"] = "12h"
): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
};
