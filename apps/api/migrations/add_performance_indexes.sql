-- ============================================================
-- CloudHost Performance Migration: Missing DB Indexes
-- Run once on the database to add all missing indexes.
-- Uses CONCURRENTLY so it doesn't lock tables in production.
-- ============================================================

-- wordpress_sites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wordpress_sites_user_id
  ON wordpress_sites(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wordpress_sites_domain
  ON wordpress_sites(domain);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wordpress_sites_status
  ON wordpress_sites(status);

-- domains
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_domains_user_id
  ON domains(user_id);

-- domain_name already has UNIQUE which implies an index; no extra needed.

-- nodejs_apps
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nodejs_apps_user_id
  ON nodejs_apps(user_id);

-- python_apps
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_python_apps_user_id
  ON python_apps(user_id);

-- user_databases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_databases_user_id
  ON user_databases(user_id);

-- hosting_accounts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hosting_accounts_user_id
  ON hosting_accounts(user_id);

-- mail tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mail_accounts_user_id
  ON mail_accounts(user_id);

-- dns tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_zones_domain_id
  ON dns_zones(domain_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dns_records_zone_id
  ON dns_records(zone_id);
