import type { Request, Response } from "express";
import { z } from "zod";
import { getDomainWithZone, addDnsRecord, deleteDnsRecord } from "../../services/odin/dns.service.js";

const addRecordSchema = z.object({
    name: z.string(),
    type: z.string(),
    content: z.string(),
    priority: z.number().optional()
});

export const getDnsZoneHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        const data = await getDomainWithZone(req.params.id as string);
        if (!data) return res.status(404).json({ success: false, error: { message: "Domain not found" } });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, error: { message: "Error fetching DNS zone" } });
    }
};

export const addDnsRecordHandler = async (req: Request, res: Response): Promise<Response> => {
    const parsed = addRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({ success: false, error: parsed.error.flatten() });
    
    try {
        const record = await addDnsRecord(req.params.zoneId as string, parsed.data.name, parsed.data.type, parsed.data.content, parsed.data.priority);
        return res.status(201).json({ success: true, data: record });
    } catch (error) {
        return res.status(500).json({ success: false, error: { message: "Error adding DNS record" } });
    }
};

export const deleteDnsRecordHandler = async (req: Request, res: Response): Promise<Response> => {
    try {
        await deleteDnsRecord(req.params.recordId as string);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ success: false, error: { message: "Error deleting DNS record" } });
    }
};
