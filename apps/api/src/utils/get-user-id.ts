import type { Request } from "express";

/**
 * Extract authenticated user ID from JWT payload.
 */
export const getUserId = async (req: Request): Promise<string> => {
  const userId = req.auth?.userId;

  if (!userId) {
    throw new Error("AUTH_REQUIRED");
  }

  return userId;
};
