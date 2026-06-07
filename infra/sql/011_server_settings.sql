-- Server Settings Schema
CREATE TABLE IF NOT EXISTS server_settings (
    key VARCHAR(128) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed defaults
INSERT INTO server_settings (key, value) VALUES
('smtp_host', ''),
('smtp_port', '25'),
('smtp_user', ''),
('smtp_pass', ''),
('smtp_secure', 'false')
ON CONFLICT (key) DO NOTHING;
