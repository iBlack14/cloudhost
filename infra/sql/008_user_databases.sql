CREATE TABLE IF NOT EXISTS user_databases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    db_name VARCHAR(128) NOT NULL,
    db_user VARCHAR(128) NOT NULL,
    db_password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- We also make sure the domains and wordpress deletions cascade nicely with this
CREATE INDEX idx_user_databases_user_id ON user_databases(user_id);
