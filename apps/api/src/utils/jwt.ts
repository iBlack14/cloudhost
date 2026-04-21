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

export interface MailSsoTokenPayload {
  userId: string;
  mailboxId: string;
  address: string;
  domain: string;
  jti: string;
  tokenType: "mail_sso";
}

export interface MailSessionTokenPayload {
  userId: string;
  mailboxId: string;
  address: string;
  domain: string;
  tokenType: "mail_session";
}

export interface DatabaseSsoTokenPayload {
  userId: string;
  dbName: string;
  dbUser: string;
  ownerUserId: string;
  jti: string;
  tokenType: "database_sso";
}

export type AuthTokenPayload =
  | AccessTokenPayload
  | ImpersonationTokenPayload
  | MailSsoTokenPayload
  | MailSessionTokenPayload
  | DatabaseSsoTokenPayload;

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

export const signMailSsoToken = (payload: MailSsoTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.MAIL_SSO_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
};

export const signMailSessionToken = (payload: MailSessionTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.MAIL_SESSION_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
};

export const signDatabaseSsoToken = (payload: DatabaseSsoTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.DATABASE_SSO_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
};
