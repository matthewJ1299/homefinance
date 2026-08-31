import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  className?: string;
}

export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground py-6 text-center", className)}
      role="status"
    >
      {message}
    </p>
  );
}
