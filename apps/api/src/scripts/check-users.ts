import { db } from "../config/db.js";

async function checkUsers() {
  try {
    const result = await db.query("SELECT username, role FROM users");
    console.log("Users in DB:", result.rows);
  } catch (err) {
    console.error("Error checking users:", err);
  } finally {
    process.exit();
  }
}

checkUsers();
