import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "../../");
const envPath = path.join(apiRoot, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { db } from "../config/db.js";


async function checkColumns() {
  try {
    const tables = ['users', 'plans', 'hosting_accounts'];
    for (const t of tables) {
      const result = await db.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1`,
        [t]
      );
      console.log(`Table: ${t}`);
      console.table(result.rows);
    }
  } catch (err) {
    console.error("Error checking columns:", err);
  } finally {
    process.exit();
  }
}

checkColumns();

