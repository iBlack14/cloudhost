import "dotenv/config";
import { randomBytes, scryptSync } from "crypto";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin1234";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@odisea.local";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

async function createAdmin() {
  console.log("🔌 Connecting to database...");

  try {
    // Check if already exists
    const existing = await pool.query(
      "SELECT id FROM users WHERE username = $1 LIMIT 1",
      [ADMIN_USER]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`⚠️  User '${ADMIN_USER}' already exists. Updating password...`);
      const hash = hashPassword(ADMIN_PASS);
      await pool.query(
        "UPDATE users SET password_hash = $1, status = 'active', role = 'admin' WHERE username = $2",
        [hash, ADMIN_USER]
      );
      console.log(`✅ Password updated for '${ADMIN_USER}'`);
    } else {
      const hash = hashPassword(ADMIN_PASS);
      await pool.query(
        `INSERT INTO users (username, email, password_hash, role, status)
         VALUES ($1, $2, $3, 'admin', 'active')`,
        [ADMIN_USER, ADMIN_EMAIL, hash]
      );
      console.log(`✅ Admin user created!`);
    }

    console.log("");
    console.log("╔══════════════════════════════════════╗");
    console.log("║      🔐  CREDENCIALES WHM/ODIN       ║");
    console.log("╠══════════════════════════════════════╣");
    console.log(`║  Usuario  : ${ADMIN_USER.padEnd(25)}║`);
    console.log(`║  Password : ${ADMIN_PASS.padEnd(25)}║`);
    console.log(`║  Email    : ${ADMIN_EMAIL.padEnd(25)}║`);
    console.log("╚══════════════════════════════════════╝");
    console.log("");
    console.log("⚠️  Cambia la contraseña en producción!");

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createAdmin();
