import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("🚀 Sincronizando catálogo maestro de 15 planes...");

  try {
    // 1. Asegurar columnas y restricciones
    await pool.query(`
      ALTER TABLE plans 
      ADD COLUMN IF NOT EXISTS price_usd DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS price_pen DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'shared',
      ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
      
      ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_name_key;
      ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
    `);

    const fullCatalog = [
      // ── Hosting Compartido
      { name: 'Unlimited Hosting Plan', price: 49.99, pen: 185, type: 'shared', disk: 999999, popular: true, features: ['NVMe Ilimitado', 'SSL Wildcard', 'Soporte VIP'] },
      { name: 'Starter', price: 4.99, pen: 19, type: 'shared', disk: 5120, features: ['5GB NVMe', 'SSL Gratis', '1 Sitio'] },
      { name: 'Business', price: 14.99, pen: 55, type: 'shared', disk: 20480, popular: true, features: ['20GB NVMe', '10 Sitios', 'Backups Diarios'] },
      { name: 'Pro', price: 29.99, pen: 110, type: 'shared', disk: 61440, features: ['60GB NVMe', 'Sitios Ilimitados', 'IP Dedicada'] },

      // ── Reseller WHM
      { name: 'Reseller Bronze', price: 29.99, pen: 110, type: 'reseller', disk: 102400, features: ['10 cuentas', '100GB NVMe', 'WHM'] },
      { name: 'Reseller Silver', price: 89.99, pen: 330, type: 'reseller', disk: 512000, popular: true, features: ['50 cuentas', '500GB NVMe', 'Overselling'] },
      { name: 'Reseller Gold', price: 199.99, pen: 750, type: 'reseller', disk: 2048000, features: ['Cuentas Ilimitadas', '2TB NVMe', 'IP Dedicada'] },

      // ── Webs Corporativas
      { name: 'Web Básica', price: 349.00, pen: 1290, type: 'web-design', disk: 5120, features: ['5 páginas', 'Responsive', 'Hosting Gratis'] },
      { name: 'Web Corporativa', price: 799.00, pen: 2950, type: 'web-design', disk: 10240, popular: true, features: ['Páginas Ilimitadas', 'CMS Blog', 'Google Analytics'] },

      // ── Sistemas Web
      { name: 'Sistema de Gestión', price: 1299.00, pen: 4800, type: 'web-system', disk: 20480, popular: true, features: ['Ventas e Inventario', 'CRM Clientes', 'PDFs'] },
      { name: 'Sistema a Medida', price: 2499.00, pen: 9200, type: 'web-system', disk: 40960, features: ['Arquitectura a medida', 'APIs', 'Garantía 12m'] },

      // ── Complementos
      { name: 'SSL Wildcard (Addon)', price: 89.00, pen: 330, type: 'addon', disk: 0, features: ['Subdominios ilimitados', '256-bit'] },
      { name: 'IP Dedicada (Addon)', price: 5.00, pen: 19, type: 'addon', disk: 0, features: ['IP Propia', 'Mejor reputación'] },

      // ── Combos
      { name: 'Combo Emprendedor', price: 12.99, pen: 48, type: 'combo', disk: 5120, features: ['Dominio .COM gratis', 'Hosting 5GB', 'SSL'] },
      { name: 'Combo Local Perú', price: 24.99, pen: 92, type: 'combo', disk: 20480, popular: true, features: ['Dominio .PE gratis', 'Hosting 20GB', 'Backup'] }
    ];

    for (const p of fullCatalog) {
      await pool.query(`
        INSERT INTO plans (name, disk_quota_mb, bandwidth_mb, price_usd, price_pen, type, features, is_popular)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (name) DO UPDATE SET 
          price_usd = EXCLUDED.price_usd, price_pen = EXCLUDED.price_pen, 
          type = EXCLUDED.type, features = EXCLUDED.features, is_popular = EXCLUDED.is_popular
      `, [p.name, p.disk, p.disk * 10, p.price, p.pen, p.type, JSON.stringify(p.features), p.popular || false]);
    }

    console.log("✅ Los 15 planes han sido sincronizados en la base de datos.");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

migrate();
