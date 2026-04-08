import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getUserRepository } from "@/lib/repositories";
import { ReconPageClient } from "@/components/recon/recon-page-client";
import { ReconDisabledPlaceholder } from "@/components/recon/recon-disabled-placeholder";

export default async function ReconPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const reconEnabled = await getUserRepository().getReconEnabled(Number(session.user.id));
  if (!reconEnabled) {
    return <ReconDisabledPlaceholder />;
  }
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ReconPageClient />
      </Suspense>
    </div>
  );
}
