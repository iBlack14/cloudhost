import { db } from "../config/db.js";

async function debugHosting() {
  try {
    console.log("--- Users ---");
    const users = await db.query("SELECT id, email, username FROM users");
    console.table(users.rows);

    console.log("\n--- Hosting Accounts ---");
    const accounts = await db.query("SELECT * FROM hosting_accounts");
    console.table(accounts.rows);
  } catch (err) {
    console.error("Error debugging hosting:", err);
  } finally {
    process.exit();
  }
}

debugHosting();
