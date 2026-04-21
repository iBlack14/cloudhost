import { NextResponse } from "next/server";

import type { MailMessageDetail } from "@odisea/types";

import { apiFetch, getMailSessionToken, unauthorizedResponse } from "../../../../lib/server-api";

export async function GET(_request: Request, { params }: { params: { messageId: string } }) {
  const token = getMailSessionToken();
  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const data = await apiFetch<MailMessageDetail>(`/mail/messages/${params.messageId}`, { token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MAIL_MESSAGE_FAILED", message: error instanceof Error ? error.message : "No se pudo cargar el mensaje" }
      },
      { status: 404 }
    );
  }
}
