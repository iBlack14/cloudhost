"use client";

import {
  createMailAccount as createMailAccountRequest,
  fetchDomains,
  fetchMailAccountById,
  fetchMailAccounts,
  issueMailSsoLink
} from "./api";
import type { MailAccountSummary } from "@odisea/types";

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
  account: MailAccountSummary
): EmailAccount => {
  const [username, domain] = account.address.split("@");
  return {
    id: account.id,
    address: account.address,
    username,
    domain,
    status: account.status,
    usedMb: account.usedMb,
    allocatedMb: account.allocatedMb,
    devicesConnected: account.devicesConnected,
    lastSync: account.lastSync
  };
};

export const fetchEmailAccounts = async (): Promise<EmailAccount[]> => {
  await wait(80);
  const accounts = await fetchMailAccounts();
  return accounts.map(makeAccount);
};

export const fetchEmailAccountById = async (accountId: string): Promise<EmailAccount> => {
  await wait(80);
  return makeAccount(await fetchMailAccountById(accountId));
};

export const fetchEmailDomains = async (): Promise<EmailDomainOption[]> => {
  await wait(120);
  const [domains, accounts] = await Promise.all([fetchDomains(), fetchMailAccounts()]);

  return domains.map((domain) => ({
    domain: domain.domain_name,
    used: accounts.filter((account) => account.domain === domain.domain_name).length,
    capacity: 80
  }));
};

export const createEmailAccount = async (
  input: CreateEmailAccountInput
): Promise<{ created: EmailAccount; result: EmailAccountActionResult }> => {
  await wait(80);
  const result = await createMailAccountRequest(input);
  return {
    created: makeAccount(result.created),
    result: result.result
  };
};

export const runEmailAccountAction = async (
  accountId: string,
  action: "check-email" | "manage" | "connect-devices"
): Promise<EmailAccountActionResult> => {
  await wait(140);
  const target = await fetchEmailAccountById(accountId);

  const messages: Record<typeof action, string> = {
    "check-email": `Webmail listo para ${target.address}.`,
    manage: `La consola de administración para ${target.address} quedará conectada en la siguiente fase.`,
    "connect-devices": `Se mostraría el asistente IMAP/SMTP para ${target.address} en la integración real.`
  };

  return {
    success: true,
    message: messages[action]
  };
};

export const fetchMailboxMessages = async (accountId: string): Promise<EmailMailboxMessage[]> => {
  await wait(200);
  const account = await fetchEmailAccountById(accountId);
  return createMailboxSeed(account);
};

export const fetchEmailWebmailSsoLink = async (accountId: string): Promise<string> => {
  await wait(60);
  const link = await issueMailSsoLink(accountId);
  return link.url;
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
