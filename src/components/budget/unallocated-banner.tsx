import { formatRand } from "@/lib/utils/currency";

interface UnallocatedBannerProps {
  unallocated: number;
  onAllocate?: () => void;
}

export function UnallocatedBanner({ unallocated }: UnallocatedBannerProps) {
  if (unallocated <= 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
      <p className="font-medium text-amber-800 dark:text-amber-200">
        R {formatRand(unallocated).replace("R", "").trim()} needs a job. Allocate to categories below.
      </p>
    </div>
  );
}
