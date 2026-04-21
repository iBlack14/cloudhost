import { NextResponse } from "next/server";

import { apiFetch, getMailSessionToken, unauthorizedResponse } from "../../../../../lib/server-api";

export async function POST(request: Request, { params }: { params: { messageId: string } }) {
  const token = getMailSessionToken();
  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const data = await apiFetch<{ success: boolean }>(`/mail/messages/${params.messageId}/star`, {
      method: "POST",
      token,
      body: JSON.stringify(body)
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MAIL_STAR_FAILED", message: error instanceof Error ? error.message : "No se pudo actualizar el mensaje" }
      },
      { status: 400 }
    );
  }
}
