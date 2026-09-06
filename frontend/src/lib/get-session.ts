import { headers } from "next/headers";
import { cache } from "react";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface Session {
  user: SessionUser;
}

function backendUrl() {
  return process.env.BACKEND_URL ?? "http://localhost:8000";
}

/**
 * Per-request session lookup for Server Components / Route Handlers.
 * Forwards the browser cookies to the standalone backend, which owns
 * the better-auth instance and the session store.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const res = await fetch(`${backendUrl()}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Session | null;
  } catch {
    // Backend unreachable (e.g. only the frontend is running in dev).
    return null;
  }
});

export async function requireUser() {
  const session = await getSession();
  return session?.user ?? null;
}
