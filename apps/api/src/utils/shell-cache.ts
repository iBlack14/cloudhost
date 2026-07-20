/** Short-lived in-memory cache for expensive shell commands (pm2 jlist, docker ps). */
const store = new Map<string, { value: unknown; expiresAt: number }>();

export const cachedShell = async <T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> => {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }
  const value = await loader();
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
};
