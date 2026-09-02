import { Suspense } from "react";
import { hasFeature } from "@/lib/features/access";
import { ReconPageClient } from "@/components/recon/recon-page-client";
import { FeatureUnavailable } from "@/components/ui/feature-unavailable";

export default async function ReconPage() {
  if (!hasFeature("recon")) {
    return (
      <div className="p-4 max-w-5xl mx-auto min-w-0">
        <FeatureUnavailable feature="recon" />
      </div>
    );
  }
  return (
    <div className="p-4 max-w-5xl mx-auto min-w-0">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ReconPageClient />
      </Suspense>
    </div>
  );
}
