"use client";

export type EmailAccountStatus = "active" | "restricted" | "system" | "quota-exceeded";

export interface EmailAccountActionResult {
  success: boolean;
  message: string;
}

export interface EmailAccount {
  id: string;
  address: string;
  username: string;
  domain: string;
  status: EmailAccountStatus;
  usedMb: number;
  allocatedMb: number | null;
  devicesConnected: number;
  lastSync: string;
}

export interface EmailDomainOption {
  domain: string;
  used: number;
  capacity: number | null;
}

export interface CreateEmailAccountInput {
  domain: string;
  username: string;
  password: string;
  quotaMb: number | null;
  sendLoginLink: boolean;
  alternateEmail: string;
  stayOnPage: boolean;
}

export type EmailAccountFilter = "all" | EmailAccountStatus;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const makeAccount = (
  id: string,
  address: string,
  status: EmailAccountStatus,
  usedMb: number,
  allocatedMb: number | null,
  devicesConnected: number,
  lastSync: string
): EmailAccount => {
  const [username, domain] = address.split("@");
  return {
    id,
    address,
    username,
    domain,
    status,
    usedMb,
    allocatedMb,
    devicesConnected,
    lastSync
  };
};

let emailAccountsStore: EmailAccount[] = [
  makeAccount("mail_01", "acc1@ciard.pe", "active", 76.16, 250, 2, "2m ago"),
  makeAccount("mail_02", "acc2@ciard.pe", "active", 76.16, 250, 3, "5m ago"),
  makeAccount("mail_03", "asistente1@ciard.pe", "active", 76.57, 250, 4, "9m ago"),
  makeAccount("mail_04", "asistente2@ciard.pe", "active", 76.57, 250, 1, "12m ago"),
  makeAccount("mail_05", "asistente3@ciard.pe", "active", 76.57, 250, 3, "18m ago"),
  makeAccount("mail_06", "capacitaciones@ciard.pe", "active", 76.85, 250, 5, "22m ago"),
  makeAccount("mail_07", "ciardpe@ciard.pe", "system", 93.35, null, 0, "system"),
  makeAccount("mail_08", "consejero1@ciard.pe", "active", 76.56, 250, 2, "25m ago"),
  makeAccount("mail_09", "consejero1.etica@ciard.pe", "restricted", 76.98, 250, 0, "1h ago"),
  makeAccount("mail_10", "consejero2@ciard.pe", "active", 76.56, 250, 2, "1h ago"),
  makeAccount("mail_11", "consejero2.etica@ciard.pe", "restricted", 76.99, 250, 1, "1h ago"),
  makeAccount("mail_12", "consejero3@ciard.pe", "active", 76.56, 250, 3, "2h ago"),
  makeAccount("mail_13", "consejeroa1@ciard.pe", "active", 76.63, 250, 1, "2h ago"),
  makeAccount("mail_14", "consejeroa2@ciard.pe", "active", 76.63, 250, 2, "3h ago"),
  makeAccount("mail_15", "contactanos@ciard.pe", "quota-exceeded", 248.4, 250, 6, "5h ago"),
  makeAccount("mail_16", "direccion.arb.jprd@ciard.pe", "active", 77.12, 250, 2, "7h ago"),
  makeAccount("mail_17", "directora.ned.med@ciard.pe", "system", 77.06, null, 0, "system"),
  makeAccount("mail_18", "gerencia.general@ciard.pe", "active", 76.99, 250, 4, "8h ago"),
  makeAccount("mail_19", "informes@ciard.pe", "active", 76.43, 250, 2, "12h ago"),
  makeAccount("mail_20", "mesadepartes@ciard.pe", "active", 76.71, 250, 7, "14h ago")
];

let emailDomainsStore: EmailDomainOption[] = [
  { domain: "ciard.pe", used: 32, capacity: null },
  { domain: "odiseacloud.com", used: 7, capacity: 80 },
  { domain: "blxkstudio.com", used: 4, capacity: 20 }
];

export const fetchEmailAccounts = async (): Promise<EmailAccount[]> => {
  await wait(180);
  return [...emailAccountsStore];
};

export const fetchEmailDomains = async (): Promise<EmailDomainOption[]> => {
  await wait(120);
  return [...emailDomainsStore];
};

export const createEmailAccount = async (
  input: CreateEmailAccountInput
): Promise<{ created: EmailAccount; result: EmailAccountActionResult }> => {
  await wait(220);

  const address = `${input.username}@${input.domain}`.toLowerCase();
  const exists = emailAccountsStore.some((account) => account.address === address);
  if (exists) {
    throw new Error("La cuenta de correo ya existe en este dominio.");
  }

  const created = makeAccount(
    `mail_${Date.now()}`,
    address,
    "active",
    0,
    input.quotaMb,
    0,
    "just now"
  );

  emailAccountsStore = [created, ...emailAccountsStore];
  emailDomainsStore = emailDomainsStore.map((domain) =>
    domain.domain === input.domain
      ? { ...domain, used: domain.used + 1 }
      : domain
  );

  return {
    created,
    result: {
      success: true,
      message: `Cuenta ${address} aprovisionada en modo mock.`
    }
  };
};

export const runEmailAccountAction = async (
  accountId: string,
  action: "check-email" | "manage" | "connect-devices"
): Promise<EmailAccountActionResult> => {
  await wait(140);

  const target = emailAccountsStore.find((account) => account.id === accountId);
  if (!target) {
    throw new Error("No se encontró la cuenta seleccionada.");
  }

  const messages: Record<typeof action, string> = {
    "check-email": `Se abriría Webmail para ${target.address} en la integración real.`,
    manage: `El panel de administración para ${target.address} quedará conectado al backend futuro.`,
    "connect-devices": `Se mostraría el asistente IMAP/SMTP para ${target.address} en la integración real.`
  };

  return {
    success: true,
    message: messages[action]
  };
};
