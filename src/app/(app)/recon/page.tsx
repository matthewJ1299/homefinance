import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { ReconPageClient } from "@/components/recon/recon-page-client";
import { ReconDisabledPlaceholder } from "@/components/recon/recon-disabled-placeholder";

export default async function ReconPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const [reconFeatureAllowed, reconPrefOn] = await Promise.all([
    userRepo.getReconFeatureAllowed(userId),
    userRepo.getReconEnabled(userId),
  ]);
  if (!reconFeatureAllowed) {
    return <ReconDisabledPlaceholder reason="no_feature_access" />;
  }
  if (!reconPrefOn) {
    return <ReconDisabledPlaceholder reason="preference" />;
  }
  return (
    <div className="p-4 max-w-5xl mx-auto min-w-0">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ReconPageClient />
      </Suspense>
    </div>
  );
}
