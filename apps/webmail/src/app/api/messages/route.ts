import { NextResponse } from "next/server";

import type { MailMessageSummary } from "@odisea/types";

import { apiFetch, getMailSessionToken, unauthorizedResponse } from "../../../lib/server-api";

export async function GET(request: Request) {
  const token = getMailSessionToken();
  if (!token) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const folder = url.searchParams.get("folder") ?? "INBOX";
  try {
    const data = await apiFetch<MailMessageSummary[]>(`/mail/messages?folder=${encodeURIComponent(folder)}`, { token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MAIL_MESSAGES_FAILED", message: error instanceof Error ? error.message : "No se pudieron cargar los mensajes" }
      },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  const token = getMailSessionToken();
  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const data = await apiFetch<{ success: boolean }>("/mail/messages/send", {
      method: "POST",
      token,
      body: JSON.stringify(body)
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MAIL_SEND_FAILED", message: error instanceof Error ? error.message : "No se pudo enviar el mensaje" }
      },
      { status: 400 }
    );
  }
}
