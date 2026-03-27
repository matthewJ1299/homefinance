import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        className ?? ""
      )}
    >
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

