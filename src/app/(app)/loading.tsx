import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
