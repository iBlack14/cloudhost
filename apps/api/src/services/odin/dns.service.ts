import { db } from "../../config/db.js";

export const ensureDnsTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS dns_zones (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id UUID NOT NULL UNIQUE,
            origin TEXT NOT NULL,
            ttl INTEGER DEFAULT 86400,
            soa_mname TEXT NOT NULL,
            soa_rname TEXT NOT NULL,
            soa_serial BIGINT,
            refresh INTEGER DEFAULT 7200,
            retry INTEGER DEFAULT 3600,
            expire INTEGER DEFAULT 1209600,
            minimum INTEGER DEFAULT 3600,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dns_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            zone_id UUID NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            content TEXT NOT NULL,
            priority INTEGER,
            ttl INTEGER DEFAULT 3600,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);
};

export const getOrCreateZone = async (domainId: string, domainName: string) => {
    await ensureDnsTables();
    const existing = await db.query("SELECT * FROM dns_zones WHERE domain_id = $1", [domainId]);
    
    if ((existing.rowCount ?? 0) > 0) return existing.rows[0];

    // Create new zone
    const result = await db.query(
        `INSERT INTO dns_zones (domain_id, origin, soa_mname, soa_rname, soa_serial) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [domainId, `${domainName}.`, "ns1.odisea.cloud.", "admin.odisea.cloud.", Date.now()]
    );
    
    const zone = result.rows[0];

    // Add default A record for the domain (Mock IP for now)
    await addDnsRecord(zone.id, "@", "A", "1.2.3.4");
    await addDnsRecord(zone.id, "www", "CNAME", domainName);

    return zone;
};

export const getZoneRecords = async (zoneId: string) => {
    await ensureDnsTables();
    const result = await db.query("SELECT * FROM dns_records WHERE zone_id = $1 ORDER BY type ASC, name ASC", [zoneId]);
    return result.rows;
};

export const addDnsRecord = async (zoneId: string, name: string, type: string, content: string, priority?: number) => {
    await ensureDnsTables();
    const result = await db.query(
        `INSERT INTO dns_records (zone_id, name, type, content, priority) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [zoneId, name, type, content, priority || null]
    );
    return result.rows[0];
};

export const deleteDnsRecord = async (recordId: string) => {
    await db.query("DELETE FROM dns_records WHERE id = $1", [recordId]);
};

export const getDomainWithZone = async (domainId: string) => {
    const domainRes = await db.query(
        "SELECT d.*, u.username as owner_name FROM domains d INNER JOIN users u ON u.id = d.user_id WHERE d.id = $1", 
        [domainId]
    );
    const domain = domainRes.rows[0];
    if (!domain) return null;

    const zone = await getOrCreateZone(domain.id, domain.domain_name);
    const records = await getZoneRecords(zone.id);

    return { domain, zone, records };
};
