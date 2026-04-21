"use client";

import type {
  MailFolder,
  MailFolderSummary,
  MailIdentity,
  MailMessageDetail,
  MailMessageSummary
} from "@odisea/types";

export const MAIL_BASE_PATH = "/mail";

const parsePayload = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Error en la petición");
  }

  return payload.data as T;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${MAIL_BASE_PATH}/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {})
    }
  });

  return parsePayload<T>(response);
};

export const loginMail = (address: string, password: string) =>
  request<MailIdentity>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ address, password })
  });

export const exchangeMailSso = (token: string) =>
  request<MailIdentity>("/auth/sso", {
    method: "POST",
    body: JSON.stringify({ token })
  });

export const logoutMail = () =>
  request<{ success: boolean }>("/auth/logout", {
    method: "POST"
  });

export const fetchMailMe = () => request<MailIdentity>("/me");
export const fetchMailFolders = () => request<MailFolderSummary[]>("/folders");
export const fetchMailMessages = (folder: MailFolder) =>
  request<MailMessageSummary[]>(`/messages?folder=${encodeURIComponent(folder)}`);
export const fetchMailMessage = (messageId: string) => request<MailMessageDetail>(`/messages/${messageId}`);
export const sendMailMessage = (input: { to: string[]; subject: string; body: string }) =>
  request<{ success: boolean }>("/messages/send", {
    method: "POST",
    body: JSON.stringify(input)
  });
export const setMailRead = (messageId: string, read: boolean) =>
  request<{ success: boolean }>(`/messages/${messageId}/read`, {
    method: "POST",
    body: JSON.stringify({ read })
  });
export const setMailStar = (messageId: string, starred: boolean) =>
  request<{ success: boolean }>(`/messages/${messageId}/star`, {
    method: "POST",
    body: JSON.stringify({ starred })
  });
export const moveMailMessage = (messageId: string, folder: "INBOX" | "SENT" | "TRASH") =>
  request<{ success: boolean }>(`/messages/${messageId}/move`, {
    method: "POST",
    body: JSON.stringify({ folder })
  });
