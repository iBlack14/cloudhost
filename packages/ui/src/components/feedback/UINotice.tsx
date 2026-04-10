import type { ReactNode } from "react";

interface UINoticeProps {
  tone?: "info" | "error" | "success";
  children?: ReactNode;
}

const tones = {
  info: "border-cyan-300/20 bg-cyan-500/10 text-cyan-200",
  error: "border-rose-300/20 bg-rose-500/10 text-rose-200",
  success: "border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
};

export const UINotice = ({ tone = "info", children }: UINoticeProps) => {
  return <p className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>{children}</p>;
};
