import { NextResponse } from "next/server";

import { apiFetch, clearMailSessionCookie, getMailSessionToken } from "../../../../lib/server-api";

export async function POST() {
  const token = getMailSessionToken();

  if (token) {
    await apiFetch<{ success: boolean }>("/mail/auth/logout", {
      method: "POST",
      token
    }).catch(() => undefined);
  }

  clearMailSessionCookie();
  return NextResponse.json({ success: true, data: { success: true } });
}
