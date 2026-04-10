import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface UIButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: Variant;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "border-transparent bg-violet-500 text-white hover:bg-violet-400",
  secondary: "border-white/15 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.08]",
  ghost: "border-transparent bg-transparent text-zinc-200 hover:bg-white/[0.06]",
  danger: "border-rose-400/50 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
};

export const UIButton = ({ variant = "secondary", children, className = "", ...props }: UIButtonProps) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
