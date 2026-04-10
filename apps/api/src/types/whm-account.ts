export interface CreateWhmAccountInput {
  domain: string;
  username: string;
  password: string;
  email: string;
  planId?: string;
  nameservers: {
    inheritRoot: boolean;
    ns1?: string;
    ns2?: string;
    ns3?: string;
    ns4?: string;
  };
  settings: {
    phpVersion: "7.4" | "8.0" | "8.1" | "8.2" | "8.3";
    shellAccess: boolean;
    nodejsEnabled: boolean;
    dockerEnabled: boolean;
  };
}

export interface CreateWhmAccountResult {
  userId: string;
  accountId: string;
}

export interface WhmImpersonationResult {
  accountId: string;
  impersonateToken: string;
  odinPanelUrl: string;
}
