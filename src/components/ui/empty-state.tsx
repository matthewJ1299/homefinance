import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  message: string;
  title?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ message, title, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("py-6 text-center space-y-3", className)}
      role="status"
    >
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <p className="text-sm text-muted-foreground">{message}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
