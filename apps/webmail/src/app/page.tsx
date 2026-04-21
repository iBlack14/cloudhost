import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MAIL_SESSION_COOKIE } from "../lib/server-api";

export default function RootPage() {
  const hasSession = Boolean(cookies().get(MAIL_SESSION_COOKIE)?.value);
  redirect(hasSession ? "/inbox" : "/login");
}
