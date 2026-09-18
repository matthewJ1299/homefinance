"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";

export interface ReconMailSource {
  graphMessageId: string;
  descriptionLine: string;
  fallbackSubject: string;
  fallbackPreview?: string | null;
  fallbackFrom?: string;
  fallbackReceived?: string;
}

export interface ReconMailDetail {
  id: string;
  subject: string;
  fromAddress: string;
  receivedDateTime: string;
  bodyContent: string;
}

/**
 * The same fetched-mail dialog the pending-items Description column opens.
 * Decision rows use it too — you cannot file a line you have not read.
 */
export function ReconMailDetailDialog({
  source,
  onOpenChange,
  extraBeforeBody,
  footerStart,
  primaryAction,
  onLoaded,
}: {
  source: ReconMailSource | null;
  onOpenChange: (open: boolean) => void;
  extraBeforeBody?: ReactNode;
  footerStart?: ReactNode;
  primaryAction?: { label: string; onClick: () => void };
  onLoaded?: (detail: ReconMailDetail | null) => void;
}) {
  const open = source != null;
  const graphMessageId = source?.graphMessageId ?? null;
  const fallbackSubject = source?.fallbackSubject ?? "";
  const fallbackPreview = source?.fallbackPreview ?? null;
  const fallbackFrom = source?.fallbackFrom ?? "";
  const fallbackReceived = source?.fallbackReceived ?? "";
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ReconMailDetail | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    if (!graphMessageId) {
      setDetail(null);
      setLoading(false);
      onLoadedRef.current?.(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    void (async () => {
      try {
        const res = await fetch(`/api/recon/messages/${encodeURIComponent(graphMessageId)}`);
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: ReconMailDetail;
        };
        if (!res.ok || !data.message) {
          throw new Error(typeof data.error === "string" ? data.error : "Failed to load email body.");
        }
        if (cancelled) return;
        setDetail(data.message);
        onLoadedRef.current?.(data.message);
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Failed to load email body.");
        const fallback: ReconMailDetail = {
          id: graphMessageId,
          subject: fallbackSubject,
          fromAddress: fallbackFrom,
          receivedDateTime: fallbackReceived,
          bodyContent: fallbackPreview
            ? `${fallbackPreview}\n\n(Unable to load full body from mailbox.)`
            : "",
        };
        setDetail(fallback);
        onLoadedRef.current?.(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [graphMessageId, fallbackSubject, fallbackPreview, fallbackFrom, fallbackReceived]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-3xl">
      <DialogHeader>Fetched mail detail</DialogHeader>
      {source ? (
        <div className="mb-3 rounded-md border border-border bg-muted/20 p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Description</p>
          <p className="whitespace-pre-wrap break-words">{source.descriptionLine.trim() || "—"}</p>
        </div>
      ) : null}
      {extraBeforeBody}
      {loading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Loading body from mailbox…</p>
          {source ? (
            <div className="space-y-1 rounded-md border border-border p-3 text-sm">
              <p>
                <span className="text-muted-foreground">From (email): </span>
                {source.fallbackFrom || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Subject: </span>
                {source.fallbackSubject || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Received: </span>
                {source.fallbackReceived || "—"}
              </p>
            </div>
          ) : null}
        </div>
      ) : detail ? (
        <div className="space-y-3">
          <div className="space-y-1 rounded-md border border-border p-3 text-sm">
            <p>
              <span className="text-muted-foreground">From (email): </span>
              <span className="select-all">{detail.fromAddress || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Subject: </span>
              <span className="select-all">{detail.subject || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Received: </span>
              <span className="select-all">{detail.receivedDateTime || "—"}</span>
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Body</p>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap select-all rounded-md border border-border bg-muted/30 p-3 text-sm">
              {detail.bodyContent || "—"}
            </pre>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data.</p>
      )}
      <DialogFooter>
        {footerStart}
        {primaryAction ? (
          <Button type="button" onClick={primaryAction.onClick} disabled={loading}>
            {primaryAction.label}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
