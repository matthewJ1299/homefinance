"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";

export interface ReconGraphPanelProps {
  connected: boolean;
  msAccountEmail: string | null | undefined;
  statusLoading: boolean;
  syncSince: string;
  syncTop: number;
  nextBatchSkip: number | null;
  syncPending: boolean;
  disconnectPending: boolean;
  onSyncSinceChange: (value: string) => void;
  onSyncTopChange: (value: number) => void;
  onSync: (skip: number) => void;
  onDisconnect: () => void;
}

export function ReconGraphPanel(props: ReconGraphPanelProps) {
  const {
    connected,
    msAccountEmail,
    statusLoading,
    syncSince,
    syncTop,
    nextBatchSkip,
    syncPending,
    disconnectPending,
    onSyncSinceChange,
    onSyncTopChange,
    onSync,
    onDisconnect,
  } = props;

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <SectionHeader title="Outlook connection" />
        {statusLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            {connected ? (
              <>
                <p className="text-sm">
                  Connected{msAccountEmail ? ` as ${msAccountEmail}` : ""}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/api/recon/graph/connect"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
                  >
                    Reconnect
                  </a>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onDisconnect}
                    disabled={disconnectPending}
                  >
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <a
                href="/api/recon/graph/connect"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Connect Outlook
              </a>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <SectionHeader
          title="Sync"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onSync(0)}
                disabled={!connected || syncPending}
              >
                {syncPending ? "Syncing…" : "Sync from mailbox"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (nextBatchSkip == null) return;
                  onSync(nextBatchSkip);
                }}
                disabled={!connected || syncPending || nextBatchSkip == null}
                title={
                  nextBatchSkip == null
                    ? "Run Sync from mailbox first to set the starting offset."
                    : `Fetch the next ${syncTop} messages (skip ${nextBatchSkip})`
                }
              >
                {syncPending ? "Syncing…" : `Fetch next ${syncTop}`}
              </Button>
            </div>
          }
        />
        <p className="text-sm text-muted-foreground">
          Fetches recent messages and parses bank templates (see docs). No transactions are added until
          you accept them below.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="recon-sync-since">Sync from (optional)</Label>
            <input
              id="recon-sync-since"
              type="date"
              className="h-9 w-full max-w-[220px] rounded-md border border-input bg-background px-2 text-sm"
              value={syncSince}
              onChange={(e) => onSyncSinceChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="recon-sync-top">Max emails to scan</Label>
            <input
              id="recon-sync-top"
              type="number"
              inputMode="numeric"
              min={1}
              max={1000}
              className="h-9 w-full max-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
              value={String(syncTop)}
              onChange={(e) => {
                const n = Number(e.target.value);
                onSyncTopChange(Number.isFinite(n) ? Math.min(Math.max(1, Math.floor(n)), 1000) : 200);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Limits mailbox scanning to messages received on/after this date.
          </p>
        </div>
        {nextBatchSkip != null ? (
          <p className="text-xs text-muted-foreground">
            Next &quot;Fetch next {syncTop}&quot; uses Graph skip {nextBatchSkip} (older mail).
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Run <strong>Sync from mailbox</strong> once to enable <strong>Fetch next {syncTop}</strong>{" "}
            for older messages.
          </p>
        )}
      </section>
    </>
  );
}
