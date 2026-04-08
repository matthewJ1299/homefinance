import { formatRand } from "@/lib/utils/currency";

interface UnallocatedBannerProps {
  toBeAllocated: number;
  onAllocate?: () => void;
}

export function UnallocatedBanner({ toBeAllocated }: UnallocatedBannerProps) {
  if (toBeAllocated === 0) return null;
  if (toBeAllocated > 0) {
    return (
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          {formatRand(toBeAllocated)} still needs a job. Allocate it to categories below.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
      <p className="font-medium text-destructive">
        Over allocated by {formatRand(Math.abs(toBeAllocated))}. Reduce one or more category allocations.
      </p>
    </div>
  );
}
