/** Poll fast while apps are busy; slow down when everything is stable. */
export const runtimeAppsPollInterval = (data: unknown): number | false => {
  const apps = Array.isArray(data) ? data : [];
  if (apps.length === 0) return false;

  const busy = apps.some((app: Record<string, unknown>) => {
    const status = String(app.status ?? "").toLowerCase();
    return ["building", "starting", "restarting", "launching", "stopping", "errored"].includes(status);
  });

  return busy ? 5000 : 30000;
};
