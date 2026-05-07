import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Manual dotenv load for monorepo roots
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "../../");
const envPath = path.join(apiRoot, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded .env from: ${envPath}`);
} else {
  console.warn(`Warning: .env not found at ${envPath}`);
}

async function ensureHostingAccount() {
  try {
    // Dynamic import to ensure env is loaded first
    const { db } = await import("../config/db.js");

    const userResult = await db.query("SELECT id, username FROM users WHERE email = $1", ["alonsoyhc@gmail.com"]);
    if (userResult.rowCount === 0) {
      console.log("User alonsoyhc@gmail.com not found.");
      return;
    }
    const user = userResult.rows[0];

    const accountResult = await db.query("SELECT id FROM hosting_accounts WHERE user_id = $1", [user.id]);
    if (accountResult.rowCount === 0) {
      console.log("Creating hosting account for user...");
      await db.query(
        `INSERT INTO hosting_accounts (user_id, domain, php_version, disk_used_mb)
         VALUES ($1, $2, $3, $4)`,
        [user.id, `${user.username}.odisea.test`, "8.2", 0]
      );
      console.log("Hosting account created.");
    } else {
      console.log("Hosting account already exists.");
    }
  } catch (err) {
    console.error("Error ensuring hosting account:", err);
  } finally {
    process.exit();
  }
}

ensureHostingAccount();
