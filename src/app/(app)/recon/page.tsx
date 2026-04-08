import { Suspense } from "react";
import { ReconPageClient } from "@/components/recon/recon-page-client";

export default function ReconPage() {
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ReconPageClient />
      </Suspense>
    </div>
  );
}
