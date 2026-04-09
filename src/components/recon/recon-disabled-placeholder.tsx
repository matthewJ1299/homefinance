import Link from "next/link";

export type ReconDisabledReason = "preference" | "no_feature_access";

interface ReconDisabledPlaceholderProps {
  /** Why the full Recon UI is not available (server decides). */
  reason?: ReconDisabledReason;
}

export function ReconDisabledPlaceholder({ reason = "preference" }: ReconDisabledPlaceholderProps) {
  const noAccess = reason === "no_feature_access";
  return (
    <div className="p-4 max-w-lg mx-auto space-y-3 rounded-lg border bg-card">
      <h1 className="text-xl font-semibold">{noAccess ? "Recon is not available" : "Recon is turned off"}</h1>
      <p className="text-sm text-muted-foreground">
        {noAccess ? (
          <>
            Recon has not been enabled for your account. When an administrator grants access, you can turn it on under
            Settings and connect Outlook here.
          </>
        ) : (
          <>
            Enable <strong>Bank email reconciliation (Recon)</strong> under Settings to use the Recon page and connect
            Outlook for bank notification emails.
          </>
        )}
      </p>
      <Link href="/settings" className="text-sm font-medium text-primary underline hover:no-underline">
        Open Settings
      </Link>
    </div>
  );
}
