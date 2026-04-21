import { NextResponse } from "next/server";

import type { MailFolderSummary } from "@odisea/types";

import { apiFetch, getMailSessionToken, unauthorizedResponse } from "../../../lib/server-api";

export async function GET() {
  const token = getMailSessionToken();
  if (!token) {
    return unauthorizedResponse();
  }

  try {
    const data = await apiFetch<MailFolderSummary[]>("/mail/folders", { token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "MAIL_FOLDERS_FAILED", message: error instanceof Error ? error.message : "No se pudieron cargar las carpetas" }
      },
      { status: 401 }
    );
  }
}
