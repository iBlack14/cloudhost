import type { ComponentPropsWithoutRef } from "react";

interface UIInputProps extends ComponentPropsWithoutRef<"input"> {
  label: string;
}

export const UIInput = ({ label, className = "", ...props }: UIInputProps) => {
  return (
    <label className="grid gap-2 text-sm text-zinc-200">
      {label}
      <input
        className={`rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-zinc-100 outline-none ring-violet-400/50 transition placeholder:text-zinc-500 focus:ring-2 ${className}`}
        {...props}
      />
    </label>
  );
};
