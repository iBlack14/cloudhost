import type { Request } from "express";
import { db } from "../config/db.js";

/**
 * Extract user ID from request headers or from database
 * Throws error instead of using invalid fallback UUID
 */
export const getUserId = async (req: Request): Promise<string> => {
  let userId = req.headers["x-user-id"] as string;
  
  if (!userId) {
    const userRes = await db.query("SELECT id FROM users LIMIT 1");
    if (userRes.rowCount === 0) {
      throw new Error("NO_USER_FOUND");
    }
    userId = userRes.rows[0].id;
  }
  
  return userId;
};
