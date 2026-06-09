import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const MAIL_BASE_PATH = "";
export const MAIL_SESSION_COOKIE = "odisea-webmail-session";
const API_BASE = (() => {
  if (typeof window === "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
    return envUrl.startsWith("//") ? "http:" + envUrl : envUrl;
  }
  const host = window.location.hostname;
  const proto = window.location.protocol;
  if (host === "localhost") return "http://localhost:3001/api/v1";
  if (host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    let port = "3001";
    try {
      const u = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;
      if (u && u.port) port = u.port;
    } catch {}
    return `${proto}//${host}:${port}/api/v1`;
  }
  const parts = host.split(".");
  return `${proto}//api.${parts.length >= 2 ? parts.slice(-2).join(".") : host}/api/v1`;
})();

export const setMailSessionCookie = (token: string) => {
  cookies().set(MAIL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
};

export const clearMailSessionCookie = () => {
  cookies().set(MAIL_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
};

export const getMailSessionToken = (): string | undefined => cookies().get(MAIL_SESSION_COOKIE)?.value;

export const parseApiPayload = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Error en la petición");
  }

  return payload.data as T;
};

export const apiFetch = async <T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> => {
  const headers = new Headers(init?.headers ?? {});

  if (init?.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  return parseApiPayload<T>(response);
};

export const unauthorizedResponse = (message = "Sesión de mail requerida") =>
  NextResponse.json(
    {
      success: false,
      error: { code: "MAIL_AUTH_REQUIRED", message }
    },
    { status: 401 }
  );
