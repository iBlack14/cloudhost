import { Router } from "express";

import {
  createWhmAccountHandler,
  impersonateWhmAccountHandler,
  listWhmAccountsHandler,
  listWhmPlansHandler,
  resumeWhmAccountHandler,
  suspendWhmAccountHandler
} from "../../controllers/whm/account.controller.js";
import { listAllDomainsHandler } from "../../controllers/odin/domain.controller.js";
import { getDnsZoneHandler, addDnsRecordHandler, deleteDnsRecordHandler } from "../../controllers/odin/dns.controller.js";
import { requireAuth } from "../../middleware/auth.js";

export const whmRouter = Router();
whmRouter.use(requireAuth({ roles: ["admin", "reseller"] }));

whmRouter.get("/dashboard", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      server: { cpu: 31, ram: 62, disk: 48 },
      accounts: { active: 120, suspended: 2, terminated: 1 }
    }
  });
});

whmRouter.get("/plans", listWhmPlansHandler);
whmRouter.get("/accounts", listWhmAccountsHandler);
whmRouter.post("/accounts", createWhmAccountHandler);
whmRouter.post("/accounts/:accountId/suspend", suspendWhmAccountHandler);
whmRouter.post("/accounts/:accountId/resume", resumeWhmAccountHandler);
whmRouter.post("/accounts/:accountId/impersonate", impersonateWhmAccountHandler);
whmRouter.get("/domains", listAllDomainsHandler);
whmRouter.get("/domains/:id/dns", getDnsZoneHandler);
whmRouter.post("/dns/zones/:zoneId/records", addDnsRecordHandler);
whmRouter.delete("/dns/records/:recordId", deleteDnsRecordHandler);
