/** Poll fast while apps are busy; keep checking the filesystem when stable. */
export const runtimeAppsPollInterval = (queryOrData: unknown): number | false => {
  const candidate = queryOrData as { state?: { data?: unknown } } | undefined;
  const data = candidate?.state ? candidate.state.data : queryOrData;
  const apps = Array.isArray(data) ? data : [];
  if (apps.length === 0) return false;

  const busy = apps.some((app: Record<string, unknown>) => {
    const status = String(app.status ?? "").toLowerCase();
    return ["building", "starting", "restarting", "launching", "stopping", "errored"].includes(status);
  });

  return busy ? 5000 : 15000;
};
