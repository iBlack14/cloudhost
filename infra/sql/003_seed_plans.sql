INSERT INTO plans (name, disk_quota_mb, bandwidth_mb, max_domains, max_emails, max_databases, allow_nodejs, allow_docker)
VALUES
  ('Starter', 5120, 51200, 1, 10, 5, false, false),
  ('Business', 20480, 204800, 5, 50, 20, true, false),
  ('Pro', 51200, 512000, 20, 200, 50, true, true)
ON CONFLICT DO NOTHING;
