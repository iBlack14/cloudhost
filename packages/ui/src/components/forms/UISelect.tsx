import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface UISelectProps extends ComponentPropsWithoutRef<"select"> {
  label: string;
  children?: ReactNode;
}

export const UISelect = ({ label, children, className = "", ...props }: UISelectProps) => {
  return (
    <label className="grid gap-2 text-sm text-zinc-200">
      {label}
      <select
        className={`rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-zinc-100 outline-none ring-violet-400/50 transition focus:ring-2 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
};
