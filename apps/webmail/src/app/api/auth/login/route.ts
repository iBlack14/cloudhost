import { NextResponse } from "next/server";

import { apiFetch, setMailSessionCookie } from "../../../../lib/server-api";
import type { MailIdentity } from "@odisea/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await apiFetch<{ token: string; me: MailIdentity }>("/mail/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    });

    setMailSessionCookie(data.token);
    return NextResponse.json({ success: true, data: data.me });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MAIL_LOGIN_FAILED", message: error instanceof Error ? error.message : "No se pudo iniciar sesión" }
      },
      { status: 401 }
    );
  }
}
