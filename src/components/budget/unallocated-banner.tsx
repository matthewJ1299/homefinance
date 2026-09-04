import { formatRand } from "@/lib/utils/currency";

interface UnallocatedBannerProps {
  /** Money with no job: income - assigned - carried overspend. */
  unassigned: number;
  onAllocate?: () => void;
}

export function UnallocatedBanner({ unassigned }: UnallocatedBannerProps) {
  if (unassigned === 0) return null;
  if (unassigned > 0) {
    return (
      <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <p className="font-medium text-amber-800 dark:text-amber-200">
          Not given a job yet &middot; {formatRand(unassigned)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
      <p className="font-medium text-destructive">
        You&rsquo;ve promised more than you have, by {formatRand(Math.abs(unassigned))}.
      </p>
    </div>
  );
}
