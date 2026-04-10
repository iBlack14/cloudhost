ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS resource_id UUID;
