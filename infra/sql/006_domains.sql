-- Domains Management
CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending_verification', -- pending_verification, active, expired
    dns_provider TEXT DEFAULT 'nexhost_managed',
    nameservers JSONB,
    ssl_enabled BOOLEAN DEFAULT false,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domain_user_id ON domains(user_id);
CREATE INDEX idx_domain_name ON domains(domain_name);
