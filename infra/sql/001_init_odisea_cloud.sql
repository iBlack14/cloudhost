-- ODISEA CLOUD core schema (base skeleton)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'reseller', 'user');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'terminated');

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  disk_quota_mb INTEGER NOT NULL,
  bandwidth_mb INTEGER NOT NULL,
  max_domains INTEGER DEFAULT 1,
  max_emails INTEGER DEFAULT 10,
  max_databases INTEGER DEFAULT 5,
  allow_nodejs BOOLEAN DEFAULT false,
  allow_docker BOOLEAN DEFAULT false,
  price_usd DECIMAL(10, 2) DEFAULT 0.00,
  price_pen DECIMAL(10, 2) DEFAULT 0.00,
  type VARCHAR(50) DEFAULT 'shared',
  features JSONB DEFAULT '[]',
  is_popular BOOLEAN DEFAULT false,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  status user_status NOT NULL DEFAULT 'active',
  plan_id UUID REFERENCES plans(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hosting_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(255) UNIQUE NOT NULL,
  document_root VARCHAR(500) NOT NULL,
  disk_used_mb INTEGER DEFAULT 0,
  bandwidth_used_mb INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(120) NOT NULL,
  resource VARCHAR(120),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate default plans
INSERT INTO plans (name, disk_quota_mb, bandwidth_mb, price_usd, price_pen, type, features, is_popular, description)
VALUES 
  ('Unlimited Hosting Plan', 999999, 9999990, 49.99, 185, 'shared', '["NVMe Ilimitado", "SSL Wildcard", "Soporte VIP"]', true, ''),
  ('Starter', 5120, 51200, 4.99, 19, 'shared', '["5GB NVMe", "SSL Gratis", "1 Sitio"]', false, ''),
  ('Business', 20480, 204800, 14.99, 55, 'shared', '["20GB NVMe", "10 Sitios", "Backups Diarios"]', true, ''),
  ('Pro', 61440, 614400, 29.99, 110, 'shared', '["60GB NVMe", "Sitios Ilimitados", "IP Dedicada"]', false, ''),
  ('Reseller Bronze', 102400, 1024000, 29.99, 110, 'reseller', '["10 cuentas", "100GB NVMe", "WHM"]', false, ''),
  ('Reseller Silver', 512000, 5120000, 89.99, 330, 'reseller', '["50 cuentas", "500GB NVMe", "Overselling"]', true, ''),
  ('Reseller Gold', 2048000, 20480000, 199.99, 750, 'reseller', '["Cuentas Ilimitadas", "2TB NVMe", "IP Dedicada"]', false, ''),
  ('Web Básica', 5120, 51200, 349.00, 1290, 'web-design', '["5 páginas", "Responsive", "Hosting Gratis"]', false, ''),
  ('Web Corporativa', 10240, 102400, 799.00, 2950, 'web-design', '["Páginas Ilimitadas", "CMS Blog", "Google Analytics"]', true, ''),
  ('Sistema de Gestión', 20480, 204800, 1299.00, 4800, 'web-system', '["Ventas e Inventario", "CRM Clientes", "PDFs"]', true, ''),
  ('Sistema a Medida', 40960, 409600, 2499.00, 9200, 'web-system', '["Arquitectura a medida", "APIs", "Garantía 12m"]', false, ''),
  ('SSL Wildcard (Addon)', 0, 0, 89.00, 330, 'addon', '["Subdominios ilimitados", "256-bit"]', false, ''),
  ('IP Dedicada (Addon)', 0, 0, 5.00, 19, 'addon', '["IP Propia", "Mejor reputación"]', false, ''),
  ('Combo Emprendedor', 5120, 51200, 12.99, 48, 'combo', '["Dominio .COM gratis", "Hosting 5GB", "SSL"]', false, ''),
  ('Combo Local Perú', 20480, 204800, 24.99, 92, 'combo', '["Dominio .PE gratis", "Hosting 20GB", "Backup"]', true, '')
ON CONFLICT (name) DO NOTHING;
