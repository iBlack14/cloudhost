interface UIStatusBadgeProps {
  status: "active" | "suspended" | "terminated" | string;
}

const styles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  suspended: "bg-amber-500/15 text-amber-300",
  terminated: "bg-zinc-500/20 text-zinc-300"
};

export const UIStatusBadge = ({ status }: UIStatusBadgeProps) => {
  const key = status.toLowerCase();
  const className = styles[key] ?? "bg-cyan-500/15 text-cyan-200";

  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${className}`}>{status}</span>;
};
