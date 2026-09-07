"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Connect, last synced, and one button.
 *
 * Everything a person with an unrecognised merchant needs from the mailbox.
 * `since`, `top` and batch `skip` stayed behind in the parser console -- they
 * are for whoever maintains the parsers, not for someone checking their spends.
 */
export function ReconConnectionBar({
  connected,
  msAccountEmail,
  lastSyncedAt,
}: {
  connected: boolean;
  msAccountEmail: string | null;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function sync() {
    setBusy(true);
    void (async () => {
      try {
        const res = await fetch("/api/recon/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(body?.error ?? "Could not check your mailbox");
          return;
        }
        const found = Number(body?.imported ?? 0);
        toast.success(
          found > 0
            ? `${found} new transaction${found === 1 ? "" : "s"} from your bank.`
            : "Nothing new since last time."
        );
        startTransition(() => router.refresh());
      } finally {
        setBusy(false);
      }
    })();
  }

  if (!connected) {
    return (
      <Card className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-medium">Connect your mailbox</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Your bank&rsquo;s notification emails become transactions you can file.
          </p>
        </div>
        <a
          href="/api/recon/graph/connect"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Connect Outlook
        </a>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">
          Connected{msAccountEmail ? ` as ${msAccountEmail}` : ""}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {lastSyncedAt
            ? `Last checked ${new Date(lastSyncedAt).toLocaleString("en-ZA")}`
            : "Not checked yet"}
        </p>
      </div>
      <Button
        type="button"
        onClick={sync}
        disabled={busy || pending}
        className="h-11 shrink-0 rounded-xl"
      >
        {busy ? "Checking…" : "Check for new transactions"}
      </Button>
    </Card>
  );
}
