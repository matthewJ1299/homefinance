import Link from "next/link";
import { FEATURES, type FeatureKey } from "@/lib/features/registry";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

export function FeatureUnavailable({ feature }: { feature: FeatureKey }) {
  const def = FEATURES[feature];
  return (
    <div className="space-y-4" data-testid="feature-unavailable" data-feature={feature}>
      <PageHeader title={def.label} />
      <p className="text-sm text-muted-foreground max-w-lg">{def.deniedMessage}</p>
      <Link
        href="/dashboard"
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium",
          "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        Back to Home
      </Link>
    </div>
  );
}