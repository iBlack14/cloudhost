import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
};

export const verifyPassword = (password: string, hash: string): boolean => {
  const [salt, digest] = hash.split(":");

  if (!salt || !digest) {
    return false;
  }

  const computedDigest = scryptSync(password, salt, 64).toString("hex");

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(computedDigest));
  } catch {
    return false;
  }
};
