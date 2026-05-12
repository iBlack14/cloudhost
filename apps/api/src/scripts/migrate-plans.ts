import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("🚀 Starting plans table migration...");

  try {
    // 1. Add columns if they don't exist
    await pool.query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS price_pen DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'shared',
      ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
    `);
    console.log("✅ Columns added successfully.");

    // 2. Insert or Update some default plans for testing
    const defaultPlans = [
      {
        name: "Starter",
        disk: 5120,
        bandwidth: 51200,
        price_usd: 4.99,
        price_pen: 19.00,
        type: "shared",
        features: ["5 GB NVMe", "SSL Gratis", "Correos Ilimitados"]
      },
      {
        name: "Unlimited Hosting Plan",
        disk: 999999,
        bandwidth: 999999,
        price_usd: 49.99,
        price_pen: 185.00,
        type: "shared",
        features: ["Espacio Ilimitado", "Soporte VIP", "Backups 12h"],
        is_popular: true
      },
      {
        name: "Reseller Bronze",
        disk: 102400,
        bandwidth: 1024000,
        price_usd: 29.99,
        price_pen: 110.00,
        type: "reseller",
        features: ["10 Cuentas cPanel", "Marca Blanca", "WHM Acceso"]
      }
    ];

    for (const p of defaultPlans) {
      await pool.query(`
        INSERT INTO plans (name, disk_quota_mb, bandwidth_mb, price_usd, price_pen, type, features, is_popular)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET 
          price_usd = EXCLUDED.price_usd,
          price_pen = EXCLUDED.price_pen,
          features = EXCLUDED.features,
          is_popular = EXCLUDED.is_popular
      `, [p.name, p.disk, p.bandwidth, p.price_usd, p.price_pen, p.type, JSON.stringify(p.features), p.is_popular || false]);
    }

    console.log("✅ Default plans synchronized.");
    console.log("🎉 Migration completed!");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
