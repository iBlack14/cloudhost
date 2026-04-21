import { NextResponse } from "next/server";

import { apiFetch, getMailSessionToken, unauthorizedResponse } from "../../../lib/server-api";
import type { MailIdentity } from "@odisea/types";

export async function GET() {
  const token = getMailSessionToken();
  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const data = await apiFetch<MailIdentity>("/mail/me", { token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MAIL_ME_FAILED", message: error instanceof Error ? error.message : "No se pudo obtener la identidad" }
      },
      { status: 401 }
    );
  }
}
