import Link from "next/link";

export function ReconDisabledPlaceholder() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-3 rounded-lg border bg-card">
      <h1 className="text-xl font-semibold">Recon is turned off</h1>
      <p className="text-sm text-muted-foreground">
        Enable <strong>Bank email reconciliation (Recon)</strong> under Settings to use the Recon page and connect
        Outlook for bank notification emails.
      </p>
      <Link href="/settings" className="text-sm font-medium text-primary underline hover:no-underline">
        Open Settings
      </Link>
    </div>
  );
}
