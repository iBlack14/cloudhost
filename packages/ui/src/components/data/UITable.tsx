import type { ReactNode } from "react";

interface UITableProps {
  header: ReactNode;
  children?: ReactNode;
}

export const UITable = ({ header, children }: UITableProps) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-zinc-400">{header}</thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
};
