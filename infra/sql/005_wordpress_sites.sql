-- WordPress Installations Tracking
CREATE TABLE IF NOT EXISTS wordpress_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES hosting_accounts(id) ON DELETE CASCADE,
    site_title TEXT NOT NULL,
    domain TEXT NOT NULL,
    install_path TEXT NOT NULL,
    wp_version TEXT NOT NULL,
    php_version TEXT NOT NULL,
    db_name TEXT NOT NULL,
    db_user TEXT NOT NULL,
    admin_user TEXT NOT NULL,
    auto_updates BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wp_user_id ON wordpress_sites(user_id);
CREATE INDEX idx_wp_domain ON wordpress_sites(domain);
