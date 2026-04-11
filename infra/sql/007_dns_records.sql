-- DNS Management System
CREATE TABLE IF NOT EXISTS dns_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    origin TEXT NOT NULL, -- domain.com.
    ttl INTEGER DEFAULT 86400,
    soa_mname TEXT NOT NULL, -- ns1.nexhost.cloud.
    soa_rname TEXT NOT NULL, -- admin.nexhost.cloud.
    soa_serial BIGINT DEFAULT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT,
    refresh INTEGER DEFAULT 7200,
    retry INTEGER DEFAULT 3600,
    expire INTEGER DEFAULT 1209600,
    minimum INTEGER DEFAULT 3600,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dns_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES dns_zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- @, www, mail
    type TEXT NOT NULL, -- A, AAAA, CNAME, MX, TXT, NS
    content TEXT NOT NULL, -- 1.2.3.4, ns1.nexhost.cloud
    priority INTEGER, -- for MX
    ttl INTEGER DEFAULT 3600,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dns_zone_domain ON dns_zones(domain_id);
CREATE INDEX idx_dns_record_zone ON dns_records(zone_id);
