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

export interface EmailMailboxMessage {
  id: string;
  from: string;
  fromAddress: string;
  subject: string;
  preview: string;
  receivedAt: string;
  read: boolean;
  starred: boolean;
  tag: "system" | "client" | "security" | "billing";
  body: string;
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

let emailAccountsStore: EmailAccount[] = [];
const mailboxStore = new Map<string, EmailMailboxMessage[]>();

let emailDomainsStore: EmailDomainOption[] = [
  { domain: "ciard.pe", used: 0, capacity: null },
  { domain: "odiseacloud.com", used: 0, capacity: 80 },
  { domain: "blxkstudio.com", used: 0, capacity: 20 }
];

export const fetchEmailAccounts = async (): Promise<EmailAccount[]> => {
  await wait(180);
  return [...emailAccountsStore];
};

export const fetchEmailAccountById = async (accountId: string): Promise<EmailAccount> => {
  await wait(140);
  const account = emailAccountsStore.find((item) => item.id === accountId);
  if (!account) {
    throw new Error("No se encontró la cuenta de correo.");
  }
  return account;
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
  mailboxStore.set(created.id, createMailboxSeed(created));
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

export const fetchMailboxMessages = async (accountId: string): Promise<EmailMailboxMessage[]> => {
  await wait(200);

  const account = emailAccountsStore.find((item) => item.id === accountId);
  if (!account) {
    throw new Error("No se encontró la cuenta seleccionada.");
  }

  const existing = mailboxStore.get(accountId);
  if (existing) {
    return [...existing];
  }

  const seeded = createMailboxSeed(account);
  mailboxStore.set(accountId, seeded);
  return [...seeded];
};

const createMailboxSeed = (account: EmailAccount): EmailMailboxMessage[] => {
  const domain = account.domain;
  const name = account.username;

  return [
    {
      id: `${account.id}_welcome`,
      from: "Odisea Cloud",
      fromAddress: `onboarding@${domain}`,
      subject: `Bienvenido a ${account.address}`,
      preview: "Tu bandeja profesional ya está activa. Aquí encontrarás accesos, guías y notificaciones clave.",
      receivedAt: "Ahora",
      read: false,
      starred: true,
      tag: "system",
      body: [
        `Hola ${name},`,
        "",
        "Tu nueva cuenta de correo ya está lista para operar dentro del ecosistema Odisea Cloud.",
        "",
        "Siguientes pasos sugeridos:",
        "1. Verifica tu firma y nombre visible.",
        "2. Conecta tus dispositivos IMAP/SMTP.",
        "3. Revisa las políticas de seguridad y reenvío.",
        "",
        "Este inbox es una experiencia mock de alta fidelidad y quedará enlazado al servicio real en la siguiente fase."
      ].join("\n")
    },
    {
      id: `${account.id}_security`,
      from: "Security Monitor",
      fromAddress: `security@${domain}`,
      subject: "Activa MFA y revisa tus dispositivos",
      preview: "Detectamos que aún no se configuró MFA. Recomendamos reforzar la seguridad antes de conectar clientes externos.",
      receivedAt: "12 min",
      read: false,
      starred: false,
      tag: "security",
      body: [
        "Equipo,",
        "",
        "La cuenta quedó provisionada sin segundo factor configurado.",
        "Antes de conectar Apple Mail, Outlook o Thunderbird, activa MFA y define tu contraseña final.",
        "",
        "Estado actual:",
        "- MFA: pendiente",
        "- Reglas IMAP: pendientes",
        "- Dispositivos confiables: 0"
      ].join("\n")
    },
    {
      id: `${account.id}_client`,
      from: "Relaciones Clientes",
      fromAddress: `clientes@${domain}`,
      subject: "Template de respuesta comercial listo",
      preview: "Dejamos preparado un borrador base para respuestas comerciales y seguimiento a leads.",
      receivedAt: "1 h",
      read: true,
      starred: false,
      tag: "client",
      body: [
        "Hola,",
        "",
        "Se cargó una plantilla inicial para respuestas rápidas, seguimientos y mensajes de prospección.",
        "",
        "Puedes usar este buzón como dirección principal de atención o derivarlo a tu equipo."
      ].join("\n")
    },
    {
      id: `${account.id}_billing`,
      from: "Billing Control",
      fromAddress: "billing@odiseacloud.com",
      subject: "Resumen de cuota y consumo inicial",
      preview: "Tu storage asignado ya está registrado y el consumo actual es 0 MB.",
      receivedAt: "3 h",
      read: true,
      starred: false,
      tag: "billing",
      body: [
        "Resumen inicial del buzón:",
        `- Storage asignado: ${account.allocatedMb === null ? "ilimitado" : `${account.allocatedMb} MB`}`,
        `- Storage usado: ${account.usedMb.toFixed(2)} MB`,
        `- Dominio: ${account.domain}`,
        "",
        "Cuando la integración real esté conectada, este resumen reflejará cuotas, archivado y eventos SMTP."
      ].join("\n")
    }
  ];
};
