"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { formatRand } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { parseAccountsApiPayload } from "@/lib/utils/accounts-api";
import type { Category } from "@/lib/types";
import type { ReconPendingListItem } from "@/lib/types/recon";
import {
  RECON_TYPE_A_FROM_SUBSTRINGS,
  RECON_TYPE_B_FROM_SUBSTRINGS,
} from "@/lib/services/recon/parsers";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const msg = typeof data === "object" && data && "error" in data && typeof data.error === "string" ? data.error : res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

type FetchedMailDebugRow = {
  graphMessageId: string;
  receivedDateTime: string;
  fromAddress: string;
  subject: string;
  bodyPreview?: string;
  /** Same line as the Recon list "Description" column (subject vs preview precedence varies by source). */
  descriptionLine?: string;
  outcome: "not_bank" | "parse_failed" | "imported_pending_add" | "imported_pending_duplicate";
  parseType?: string;
  matchedExpenseCount?: number;
  parseFailedReasons?: string[];
  parseAttempt?: { amountMinorUnits: number | null; date: string | null; vendor: string | null };
};

/** Substrings matched against `fromAddress` for the “bank senders only” fetched-mail filter (type A + B). */
const RECON_BANK_FROM_SUBSTRINGS = [
  ...RECON_TYPE_A_FROM_SUBSTRINGS,
  ...RECON_TYPE_B_FROM_SUBSTRINGS,
] as readonly string[];

type DebugOutcomeFilter = "all" | "imported" | "parse_failed" | "not_bank";

/** Per-row bulk queue: none = no bulk action; ignore / accept apply when you click Process marked. */
type ReconBulkIntent = "none" | "ignore" | "accept";

interface ProcessMarkedSummary {
  dateRangeLabel: string;
  /** Rows completed successfully (ignore + duplicate + add). */
  processedCount: number;
  totalMinor: number;
  ignoredCount: number;
  ignoredMinor: number;
  acceptedDuplicateCount: number;
  duplicateMinor: number;
  acceptedAddCount: number;
  addMinor: number;
  addByCategory: { categoryName: string; count: number; totalMinor: number }[];
  skippedNoCategory: number;
}

function formatReconDateRange(dates: string[]): string {
  if (dates.length === 0) return "—";
  const sorted = [...dates].sort();
  const lo = sorted[0]!;
  const hi = sorted[sorted.length - 1]!;
  if (lo === hi) return lo;
  return `${lo} – ${hi}`;
}

function categoryNameForId(categories: Category[], categoryId: number): string {
  return categories.find((c) => c.id === categoryId)?.name ?? `Category #${categoryId}`;
}

function filterFetchedMailRow(
  m: FetchedMailDebugRow,
  bankSendersOnly: boolean,
  outcomeFilter: DebugOutcomeFilter
): boolean {
  if (bankSendersOnly) {
    const f = (m.fromAddress ?? "").toLowerCase();
    if (!RECON_BANK_FROM_SUBSTRINGS.some((sub) => f.includes(sub.toLowerCase()))) return false;
  }
  switch (outcomeFilter) {
    case "all":
      return true;
    case "imported":
      return m.outcome === "imported_pending_add" || m.outcome === "imported_pending_duplicate";
    case "parse_failed":
      return m.outcome === "parse_failed";
    case "not_bank":
      return m.outcome === "not_bank";
  }
}

function buildReconDebugBundle(meta: FetchedMailDebugRow, detail: { subject: string; fromAddress: string; receivedDateTime: string; bodyContent: string; id: string }): string {
  const lines: string[] = ["--- HomeFinance Recon debug bundle ---", ""];
  lines.push(`Graph message id: ${detail.id}`);
  if (meta.descriptionLine?.trim()) {
    lines.push(`Description (list): ${meta.descriptionLine.trim()}`);
  }
  lines.push(`Outcome: ${meta.outcome}`);
  if (meta.parseType) lines.push(`Template: ${meta.parseType}`);
  if (meta.outcome === "parse_failed") {
    lines.push(
      `Parse failed reasons: ${meta.parseFailedReasons?.length ? meta.parseFailedReasons.join(", ") : "(none recorded)"}`
    );
    if (meta.parseAttempt) {
      lines.push(
        `Attempted extract: amountMinorUnits=${meta.parseAttempt.amountMinorUnits ?? "null"}, date=${meta.parseAttempt.date ?? "null"}, vendor=${meta.parseAttempt.vendor ?? "null"}`
      );
    }
  }
  if (meta.matchedExpenseCount != null) lines.push(`Matched expense count: ${meta.matchedExpenseCount}`);
  lines.push("");
  lines.push(`From (email): ${detail.fromAddress || meta.fromAddress || "—"}`);
  lines.push(`Subject: ${detail.subject || meta.subject || "—"}`);
  lines.push(`Received: ${detail.receivedDateTime || meta.receivedDateTime || "—"}`);
  lines.push("");
  lines.push("--- Body ---");
  lines.push(detail.bodyContent || "—");
  lines.push("");
  lines.push("--- End ---");
  return lines.join("\n");
}

export function ReconPageClient() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [categoryByItemId, setCategoryByItemId] = useState<Record<number, number | "">>({});
  const [splitByItemId, setSplitByItemId] = useState<Record<number, boolean>>({});
  const [accountId, setAccountId] = useState<number | "">("");
  const [syncSince, setSyncSince] = useState<string>("");
  const [syncTop, setSyncTop] = useState<number>(50);
  /** After a successful "Sync from mailbox", this is the Graph `$skip` for the next "Fetch next batch". */
  const [nextBatchSkip, setNextBatchSkip] = useState<number | null>(null);
  const [syncDebug, setSyncDebug] = useState<null | { truncated: boolean; messages: FetchedMailDebugRow[] }>(null);
  const [debugBankSendersOnly, setDebugBankSendersOnly] = useState(false);
  const [debugOutcomeFilter, setDebugOutcomeFilter] = useState<DebugOutcomeFilter>("all");
  const [debugPage, setDebugPage] = useState(1);
  const debugPageSize = 25;

  const filteredSyncMessages = useMemo(() => {
    if (!syncDebug?.messages.length) return [];
    return syncDebug.messages.filter((m) =>
      filterFetchedMailRow(m, debugBankSendersOnly, debugOutcomeFilter)
    );
  }, [syncDebug, debugBankSendersOnly, debugOutcomeFilter]);

  useEffect(() => {
    setDebugPage(1);
  }, [debugBankSendersOnly, debugOutcomeFilter, syncDebug?.messages]);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageSyncMeta, setMessageSyncMeta] = useState<FetchedMailDebugRow | null>(null);
  const [messageDetail, setMessageDetail] = useState<null | {
    id: string;
    subject: string;
    fromAddress: string;
    receivedDateTime: string;
    bodyContent: string;
  }>(null);
  const [bulkIntentByItemId, setBulkIntentByItemId] = useState<Record<number, ReconBulkIntent>>({});
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [processMarkedSummaryOpen, setProcessMarkedSummaryOpen] = useState(false);
  const [processMarkedSummary, setProcessMarkedSummary] = useState<ProcessMarkedSummary | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    const connected = searchParams.get("connected");
    if (err) {
      toast.error(decodeURIComponent(err));
    }
    if (connected === "1") {
      toast.success("Outlook connected.");
    }
  }, [searchParams]);

  const statusQuery = useQuery({
    queryKey: ["recon-graph-status"],
    queryFn: () =>
      fetchJson<{
        reconEnabled: boolean;
        connected: boolean;
        msAccountEmail: string | null;
        lastSyncedAt: string | null;
      }>("/api/recon/graph/status"),
  });

  const itemsQuery = useQuery({
    queryKey: ["recon-items"],
    queryFn: () => fetchJson<{ reconEnabled: boolean; items: ReconPendingListItem[] }>("/api/recon/items"),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchJson<{ categories: Category[] }>("/api/categories"),
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts-recon"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to load accounts");
      return parseAccountsApiPayload(data);
    },
  });

  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data?.items]);
  const categories = useMemo(
    () => categoriesQuery.data?.categories ?? [],
    [categoriesQuery.data?.categories]
  );
  const { accounts, primaryAccountId } = accountsQuery.data ?? { accounts: [], primaryAccountId: null };

  useEffect(() => {
    if (primaryAccountId != null && accountId === "") {
      setAccountId(primaryAccountId);
    }
  }, [primaryAccountId, accountId]);

  const itemsForCategoryInit = itemsQuery.data?.items;
  useEffect(() => {
    if (!itemsForCategoryInit?.length) return;
    setCategoryByItemId((prev) => {
      const next = { ...prev };
      for (const item of itemsForCategoryInit) {
        if (next[item.id] === undefined) {
          next[item.id] = item.suggestedCategoryId ?? "";
        }
      }
      return next;
    });
  }, [itemsForCategoryInit]);

  useEffect(() => {
    const valid = new Set(items.map((i) => i.id));
    setBulkIntentByItemId((prev) => {
      const next: Record<number, ReconBulkIntent> = {};
      for (const [k, v] of Object.entries(prev)) {
        const id = Number(k);
        if (valid.has(id)) next[id] = v;
      }
      return next;
    });
  }, [items]);

  const syncMutation = useMutation({
    mutationFn: (vars: { skip: number }) =>
      fetchJson<{ imported: number; scanned: number; skip?: number; debug?: { truncated: boolean; messages: unknown[] } }>(
        "/api/recon/sync",
        {
          method: "POST",
          body: JSON.stringify({
            since: syncSince || undefined,
            debug: true,
            top: syncTop,
            skip: vars.skip,
          }),
        }
      ),
    onSuccess: (data, vars) => {
      toast.success(`Synced: ${data.imported} bank email(s) matched.`);
      if (vars.skip === 0) {
        setNextBatchSkip(syncTop);
      } else {
        setNextBatchSkip((prev) => (prev ?? 0) + syncTop);
      }
      if (data.debug && typeof data.debug === "object") {
        setSyncDebug(data.debug as { truncated: boolean; messages: FetchedMailDebugRow[] });
        setDebugPage(1);
      } else {
        setSyncDebug(null);
        setDebugPage(1);
      }
      void queryClient.invalidateQueries({ queryKey: ["recon-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => fetchJson<{ ok: boolean }>("/api/recon/graph/disconnect", { method: "POST" }),
    onSuccess: () => {
      toast.success("Disconnected Outlook.");
      void queryClient.invalidateQueries({ queryKey: ["recon-graph-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actDuplicate = useMutation({
    mutationFn: (itemId: number) =>
      fetchJson<{ ok: boolean }>(`/api/recon/items/${itemId}/accept-duplicate`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recon-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actAdd = useMutation({
    mutationFn: (vars: { itemId: number; categoryId: number; accountId?: number | null; split?: boolean }) =>
      fetchJson<{ expenseId: number }>(`/api/recon/items/${vars.itemId}/accept-add`, {
        method: "POST",
        body: JSON.stringify({
          categoryId: vars.categoryId,
          accountId: vars.accountId ?? undefined,
          split: vars.split ?? false,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recon-items"] });
      toast.success("Expense added.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actIgnore = useMutation({
    mutationFn: (itemId: number) =>
      fetchJson<{ ok: boolean }>(`/api/recon/items/${itemId}/ignore`, { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recon-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setBulkIntent = useCallback((itemId: number, v: ReconBulkIntent) => {
    setBulkIntentByItemId((p) => ({ ...p, [itemId]: v }));
  }, []);

  const clearBulkMarks = useCallback(() => {
    setBulkIntentByItemId({});
  }, []);

  const setCategory = useCallback((itemId: number, value: number | "") => {
    setCategoryByItemId((p) => ({ ...p, [itemId]: value }));
  }, []);

  const setSplit = useCallback((itemId: number, value: boolean) => {
    setSplitByItemId((p) => ({ ...p, [itemId]: value }));
  }, []);

  const effectiveCategory = useCallback(
    (item: ReconPendingListItem): number | "" => {
      const v = categoryByItemId[item.id];
      if (v !== undefined && v !== "") return v;
      return item.suggestedCategoryId ?? "";
    },
    [categoryByItemId]
  );

  const processMarked = useCallback(async () => {
    if (bulkProcessing) return;
    const toIgnore = items.filter((i) => (bulkIntentByItemId[i.id] ?? "none") === "ignore");
    const toAccept = items.filter((i) => (bulkIntentByItemId[i.id] ?? "none") === "accept");
    if (toIgnore.length === 0 && toAccept.length === 0) {
      toast.message("No rows marked to process.");
      return;
    }
    const acc =
      accountId === "" ? undefined : typeof accountId === "number" ? accountId : undefined;
    setBulkProcessing(true);
    let ignored = 0;
    let duped = 0;
    let added = 0;
    let skippedNoCat = 0;
    const processedIds: number[] = [];
    const processedDates: string[] = [];
    let ignoredMinor = 0;
    let duplicateMinor = 0;
    let addMinor = 0;
    const addCategoryMap = new Map<string, { count: number; totalMinor: number }>();
    try {
      for (const item of toIgnore) {
        await fetchJson<{ ok: boolean }>(`/api/recon/items/${item.id}/ignore`, { method: "POST" });
        ignored++;
        processedIds.push(item.id);
        processedDates.push(item.txnDate);
        ignoredMinor += item.amount;
      }
      for (const item of toAccept) {
        if (item.status === "pending_duplicate") {
          await fetchJson<{ ok: boolean }>(`/api/recon/items/${item.id}/accept-duplicate`, {
            method: "POST",
          });
          duped++;
          processedIds.push(item.id);
          processedDates.push(item.txnDate);
          duplicateMinor += item.amount;
          continue;
        }
        const cat = effectiveCategory(item);
        if (typeof cat !== "number" || !cat) {
          skippedNoCat++;
          continue;
        }
        const split = splitByItemId[item.id] ?? false;
        await fetchJson<{ expenseId: number }>(`/api/recon/items/${item.id}/accept-add`, {
          method: "POST",
          body: JSON.stringify({
            categoryId: cat,
            accountId: acc ?? undefined,
            split,
          }),
        });
        added++;
        processedIds.push(item.id);
        processedDates.push(item.txnDate);
        addMinor += item.amount;
        const cname = categoryNameForId(categories, cat);
        const prev = addCategoryMap.get(cname) ?? { count: 0, totalMinor: 0 };
        addCategoryMap.set(cname, {
          count: prev.count + 1,
          totalMinor: prev.totalMinor + item.amount,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["recon-items"] });
      setBulkIntentByItemId((prev) => {
        const next = { ...prev };
        for (const id of processedIds) {
          delete next[id];
        }
        return next;
      });
      const processedCount = ignored + duped + added;
      const totalMinor = ignoredMinor + duplicateMinor + addMinor;
      const addByCategory = [...addCategoryMap.entries()]
        .map(([categoryName, v]) => ({
          categoryName,
          count: v.count,
          totalMinor: v.totalMinor,
        }))
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      setProcessMarkedSummary({
        dateRangeLabel: formatReconDateRange(processedDates),
        processedCount,
        totalMinor,
        ignoredCount: ignored,
        ignoredMinor,
        acceptedDuplicateCount: duped,
        duplicateMinor,
        acceptedAddCount: added,
        addMinor,
        addByCategory,
        skippedNoCategory: skippedNoCat,
      });
      setProcessMarkedSummaryOpen(true);
      if (skippedNoCat > 0) {
        toast.message(
          `${skippedNoCat} accept-marked row(s) had no category and were skipped. Fix categories and run Process marked again if needed.`
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed.");
    } finally {
      setBulkProcessing(false);
    }
  }, [
    items,
    bulkIntentByItemId,
    bulkProcessing,
    accountId,
    splitByItemId,
    effectiveCategory,
    queryClient,
    categories,
  ]);

  const openMessage = useCallback(async (row: FetchedMailDebugRow) => {
    const meta: FetchedMailDebugRow = {
      ...row,
      descriptionLine: row.descriptionLine ?? (row.bodyPreview?.trim() || row.subject?.trim() || "—"),
    };
    setMessageSyncMeta(meta);
    setMessageDialogOpen(true);
    setMessageLoading(true);
    setMessageDetail(null);
    try {
      const data = await fetchJson<{ message: { id: string; subject: string; fromAddress: string; receivedDateTime: string; bodyContent: string } }>(
        `/api/recon/messages/${encodeURIComponent(row.graphMessageId)}`
      );
      setMessageDetail(data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load email body.");
      setMessageDetail({
        id: row.graphMessageId,
        subject: row.subject,
        fromAddress: row.fromAddress,
        receivedDateTime: row.receivedDateTime,
        bodyContent: "",
      });
    } finally {
      setMessageLoading(false);
    }
  }, []);

  const openMessageFromPendingItem = useCallback(async (item: ReconPendingListItem) => {
    const descriptionLine = item.rawSubject?.trim() || item.rawBodyPreview?.trim() || "—";
    const meta: FetchedMailDebugRow = {
      graphMessageId: item.graphMessageId,
      receivedDateTime: "",
      fromAddress: "",
      subject: item.rawSubject ?? "",
      bodyPreview: item.rawBodyPreview ?? undefined,
      descriptionLine,
      outcome: item.status === "pending_duplicate" ? "imported_pending_duplicate" : "imported_pending_add",
      parseType: item.parseType,
      matchedExpenseCount: item.matchedExpenseIds?.length ?? undefined,
    };
    setMessageSyncMeta(meta);
    setMessageDialogOpen(true);
    setMessageLoading(true);
    setMessageDetail(null);
    try {
      const data = await fetchJson<{ message: { id: string; subject: string; fromAddress: string; receivedDateTime: string; bodyContent: string } }>(
        `/api/recon/messages/${encodeURIComponent(item.graphMessageId)}`
      );
      setMessageDetail(data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load email body.");
      setMessageDetail({
        id: item.graphMessageId,
        subject: item.rawSubject ?? "",
        fromAddress: "",
        receivedDateTime: "",
        bodyContent: item.rawBodyPreview
          ? `${item.rawBodyPreview}\n\n(Unable to load full body from mailbox.)`
          : "",
      });
    } finally {
      setMessageLoading(false);
    }
  }, []);

  const copyMessageDebugBundle = useCallback(async () => {
    if (!messageSyncMeta || !messageDetail) {
      toast.error("Nothing to copy yet.");
      return;
    }
    const text = buildReconDebugBundle(messageSyncMeta, messageDetail);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Debug bundle copied to clipboard.");
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }, [messageSyncMeta, messageDetail]);

  const statusLabel = (s: ReconPendingListItem["status"]): string => {
    switch (s) {
      case "pending_duplicate":
        return "Possible duplicate";
      case "pending_add":
        return "Needs add";
      default:
        return s;
    }
  };

  const connected = statusQuery.data?.connected ?? false;
  const msEmail = statusQuery.data?.msAccountEmail;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recon</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Connect Outlook, sync recent bank notification emails, then accept or ignore each parsed transaction.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <SectionHeader title="Outlook connection" />
        {statusQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            {connected ? (
              <>
                <p className="text-sm">
                  Connected{msEmail ? ` as ${msEmail}` : ""}.
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
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
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
                onClick={() => syncMutation.mutate({ skip: 0 })}
                disabled={!connected || syncMutation.isPending}
              >
                {syncMutation.isPending ? "Syncing…" : "Sync from mailbox"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (nextBatchSkip == null) return;
                  syncMutation.mutate({ skip: nextBatchSkip });
                }}
                disabled={!connected || syncMutation.isPending || nextBatchSkip == null}
                title={
                  nextBatchSkip == null
                    ? "Run Sync from mailbox first to set the starting offset."
                    : `Fetch the next ${syncTop} messages (skip ${nextBatchSkip})`
                }
              >
                {syncMutation.isPending ? "Syncing…" : `Fetch next ${syncTop}`}
              </Button>
            </div>
          }
        />
        <p className="text-sm text-muted-foreground">
          Fetches recent messages and parses bank templates (see docs). No transactions are added until you accept them below.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="recon-sync-since">Sync from (optional)</Label>
            <input
              id="recon-sync-since"
              type="date"
              className="h-9 w-full max-w-[220px] rounded-md border border-input bg-background px-2 text-sm"
              value={syncSince}
              onChange={(e) => setSyncSince(e.target.value)}
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
                setSyncTop(Number.isFinite(n) ? Math.min(Math.max(1, Math.floor(n)), 1000) : 200);
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
            Run <strong>Sync from mailbox</strong> once to enable <strong>Fetch next {syncTop}</strong> for older messages.
          </p>
        )}
      </section>

      {syncDebug ? (
        <CollapsibleSection
          title={`Fetched emails (${
            debugBankSendersOnly || debugOutcomeFilter !== "all"
              ? `${filteredSyncMessages.length} of ${syncDebug.messages.length}${syncDebug.truncated ? "+" : ""}`
              : `${syncDebug.messages.length}${syncDebug.truncated ? "+" : ""}`
          })`}
        >
          <p className="text-xs text-muted-foreground mb-3">
            Highlighting: green = imported, amber = imported + duplicate, red = matched bank template but parse failed.
            {syncDebug.truncated ? " (List is truncated.)" : ""}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end mb-3">
            <label
              className="flex items-center gap-2 text-sm cursor-pointer select-none"
              title={`From contains: ${RECON_BANK_FROM_SUBSTRINGS.join(", ")}`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-input"
                checked={debugBankSendersOnly}
                onChange={(e) => setDebugBankSendersOnly(e.target.checked)}
              />
              <span>Bank sender addresses only (type A &amp; B)</span>
            </label>
            <div className="flex flex-col gap-1">
              <Label htmlFor="recon-debug-outcome">Outcome</Label>
              <select
                id="recon-debug-outcome"
                className="h-9 min-w-[200px] rounded-md border border-input bg-background px-2 text-sm"
                value={debugOutcomeFilter}
                onChange={(e) => setDebugOutcomeFilter(e.target.value as DebugOutcomeFilter)}
              >
                <option value="all">All</option>
                <option value="imported">Imported</option>
                <option value="parse_failed">Parse failed</option>
                <option value="not_bank">Not bank</option>
              </select>
            </div>
          </div>
          {(() => {
            const total = filteredSyncMessages.length;
            const totalPages = Math.max(1, Math.ceil(total / debugPageSize));
            const safePage = Math.min(Math.max(1, debugPage), totalPages);
            const start = (safePage - 1) * debugPageSize;
            const pageRows = filteredSyncMessages.slice(start, start + debugPageSize);
            const canPrev = safePage > 1;
            const canNext = safePage < totalPages;
            return (
              <div className="space-y-3">
                {total === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {syncDebug.messages.length === 0
                      ? "No messages in this sync batch."
                      : "No messages match the current filters."}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Showing {start + 1}-{Math.min(start + debugPageSize, total)} of {total}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!canPrev}
                          onClick={() => setDebugPage((p) => Math.max(1, p - 1))}
                        >
                          Prev
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          Page {safePage} / {totalPages}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={!canNext}
                          onClick={() => setDebugPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse min-w-[920px]">
                        <thead>
                          <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Received</th>
                            <th className="py-2 pr-3 font-medium">From</th>
                            <th className="py-2 pr-3 font-medium">Subject</th>
                            <th className="py-2 pr-3 font-medium">Preview</th>
                            <th className="py-2 font-medium">Outcome</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((m) => {
                        const cls =
                          m.outcome === "imported_pending_duplicate"
                            ? "bg-amber-500/10"
                            : m.outcome === "imported_pending_add"
                              ? "bg-emerald-500/10"
                              : m.outcome === "parse_failed"
                                ? "bg-red-500/10"
                                : "";
                        const outcomeLabel =
                          m.outcome === "not_bank"
                            ? "Not bank (sender/subject)"
                            : m.outcome === "parse_failed"
                              ? `Parse failed${m.parseFailedReasons?.length ? ` (${m.parseFailedReasons.join(", ")})` : ""}`
                              : m.outcome === "imported_pending_duplicate"
                                ? `Imported (duplicate${m.matchedExpenseCount ? `: ${m.matchedExpenseCount}` : ""})`
                                : "Imported (needs add)";
                        const preview = (m.bodyPreview ?? "").trim();
                        return (
                          <tr key={m.graphMessageId} className={`border-b border-border/60 align-top ${cls}`}>
                            <td className="py-2 pr-3 whitespace-nowrap">{m.receivedDateTime || "—"}</td>
                            <td className="py-2 pr-3 max-w-[220px]">
                              <span className="line-clamp-2" title={m.fromAddress}>
                                {m.fromAddress || "—"}
                              </span>
                            </td>
                            <td className="py-2 pr-3 max-w-[300px]">
                              <span className="line-clamp-2" title={m.subject}>
                                {m.subject || "—"}
                              </span>
                            </td>
                            <td className="py-2 pr-3 max-w-[320px]">
                              <button
                                type="button"
                                className="text-left w-full"
                                onClick={() => void openMessage(m)}
                                title="Click to view full body"
                              >
                                <span className="line-clamp-2 text-muted-foreground">
                                  {preview || "—"}
                                </span>
                              </button>
                            </td>
                            <td className="py-2">{outcomeLabel}</td>
                          </tr>
                        );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </CollapsibleSection>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <SectionHeader title="Pending items" />
        {!itemsQuery.isLoading && items.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              size="sm"
              disabled={bulkProcessing}
              onClick={() => void processMarked()}
            >
              {bulkProcessing ? "Working…" : "Process marked"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={bulkProcessing}
              onClick={clearBulkMarks}
            >
              Clear marks
            </Button>
            <p className="text-xs text-muted-foreground sm:max-w-xl">
              In the Mark column, choose None, Ignore, or Accept (one radio group per row). Rows marked Ignore or Accept
              are shaded. None skips that row for bulk. Process marked runs ignores first, then accepts (duplicates need
              no category; adds need a category or they stay pending), then opens a summary: date range, counts, totals
              by category for new expenses, and overall total.
            </p>
          </div>
        ) : null}
        {itemsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending recon items. Sync after connecting Outlook.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium w-[148px] min-w-[148px]">Mark</th>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Vendor</th>
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 font-medium tabular-nums">Amount</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Split</th>
                  <th className="py-2 font-medium min-w-[200px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const cat = effectiveCategory(item);
                  const canAdd = typeof cat === "number" && cat > 0;
                  const acc =
                    accountId === "" ? undefined : typeof accountId === "number" ? accountId : undefined;
                  const split = splitByItemId[item.id] ?? false;
                  const markGroup = `recon-mark-${item.id}`;
                  const markValue = bulkIntentByItemId[item.id] ?? "none";
                  const showMatchedDetails =
                    item.status === "pending_duplicate" && (item.matchedExpenses?.length ?? 0) > 0;
                  const isMarked = markValue === "ignore" || markValue === "accept";
                  return (
                    <Fragment key={item.id}>
                    <tr
                      className={cn(
                        "border-b border-border/60 align-top",
                        isMarked && "bg-muted/45 text-muted-foreground"
                      )}
                    >
                      <td className="py-3 pr-2 align-top">
                        <div
                          className="flex flex-col gap-1.5"
                          role="radiogroup"
                          aria-label={`Mark for recon item ${item.id}`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer text-sm leading-none">
                            <input
                              type="radio"
                              name={markGroup}
                              value="none"
                              className="h-4 w-4 shrink-0 border-input accent-primary"
                              checked={markValue === "none"}
                              onChange={() => setBulkIntent(item.id, "none")}
                            />
                            None
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm leading-none">
                            <input
                              type="radio"
                              name={markGroup}
                              value="ignore"
                              className="h-4 w-4 shrink-0 border-input accent-primary"
                              checked={markValue === "ignore"}
                              onChange={() => setBulkIntent(item.id, "ignore")}
                            />
                            Ignore
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm leading-none">
                            <input
                              type="radio"
                              name={markGroup}
                              value="accept"
                              className="h-4 w-4 shrink-0 border-input accent-primary"
                              checked={markValue === "accept"}
                              onChange={() => setBulkIntent(item.id, "accept")}
                            />
                            Accept
                          </label>
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">{item.txnDate}</td>
                      <td className="py-3 pr-3 max-w-[200px]">
                        <span className="line-clamp-2" title={item.vendor}>
                          {item.vendor}
                        </span>
                      </td>
                      <td className="py-3 pr-3 max-w-[260px]">
                        <button
                          type="button"
                          className="w-full text-left line-clamp-2 text-muted-foreground hover:text-foreground hover:underline decoration-dotted underline-offset-2"
                          title="View full email"
                          onClick={() => void openMessageFromPendingItem(item)}
                        >
                          {item.rawSubject ?? item.rawBodyPreview ?? "—"}
                        </button>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{formatRand(item.amount)}</td>
                      <td className="py-3 pr-3">
                        <div>{statusLabel(item.status)}</div>
                      </td>
                      <td className="py-3 pr-3 min-w-[160px]">
                        <select
                          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                          value={cat === "" ? "" : String(cat)}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCategory(item.id, v === "" ? "" : Number(v));
                          }}
                        >
                          <option value="">Select category…</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <input
                            id={`recon-split-${item.id}`}
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={split}
                            onChange={(e) => setSplit(item.id, e.target.checked)}
                          />
                          <Label htmlFor={`recon-split-${item.id}`} className="text-sm">
                            Split 50/50
                          </Label>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap">
                          {item.status === "pending_duplicate" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full sm:w-auto"
                              disabled={actDuplicate.isPending}
                              onClick={() => actDuplicate.mutate(item.id)}
                            >
                              Accept as duplicate
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={!canAdd || actAdd.isPending}
                            onClick={() => {
                              if (!canAdd || typeof cat !== "number") {
                                toast.error("Choose a category before adding.");
                                return;
                              }
                              actAdd.mutate({
                                itemId: item.id,
                                categoryId: cat,
                                accountId: acc ?? null,
                                split,
                              });
                            }}
                          >
                            Accept and add
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                            disabled={actIgnore.isPending}
                            onClick={() => actIgnore.mutate(item.id)}
                          >
                            Ignore
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {showMatchedDetails ? (
                      <tr
                        className={cn(
                          "border-b border-border/60",
                          isMarked ? "bg-muted/40 text-muted-foreground" : "bg-muted/20"
                        )}
                      >
                        <td colSpan={9} className="py-2 px-3 pb-3 align-top">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Possible duplicate — expense already on file (same calendar day and amount)
                          </p>
                          <ul className="space-y-2">
                            {(item.matchedExpenses ?? []).map((m) => (
                              <li
                                key={m.id}
                                className="rounded-md border border-border/70 bg-background px-3 py-2 text-sm"
                              >
                                <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Category</dt>
                                    <dd className="font-medium">{m.categoryName}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Amount</dt>
                                    <dd className="tabular-nums font-medium">{formatRand(m.amount)}</dd>
                                  </div>
                                  <div className="sm:col-span-2 lg:col-span-2">
                                    <dt className="text-xs text-muted-foreground">Note</dt>
                                    <dd className="break-words">{m.note?.trim() ? m.note : "—"}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-muted-foreground">Date</dt>
                                    <dd className="tabular-nums">{m.date}</dd>
                                  </div>
                                </dl>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ) : item.status === "pending_duplicate" &&
                      (item.matchedExpenseIds?.length ?? 0) > 0 &&
                      (item.matchedExpenses?.length ?? 0) === 0 ? (
                      <tr
                        className={cn(
                          "border-b border-border/60",
                          isMarked ? "bg-muted/40 text-muted-foreground" : "bg-muted/20"
                        )}
                      >
                        <td colSpan={9} className="py-2 px-3 text-xs text-muted-foreground">
                          Possible duplicate: linked expense(s) are no longer found (they may have been deleted).
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={messageDialogOpen}
        onOpenChange={(open) => {
          setMessageDialogOpen(open);
          if (!open) {
            setMessageLoading(false);
            setMessageDetail(null);
            setMessageSyncMeta(null);
          }
        }}
        className="max-w-3xl"
      >
        <DialogHeader>Fetched mail detail</DialogHeader>
        {messageSyncMeta ? (
          <div className="mb-3 rounded-md border border-border bg-muted/20 p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
            <p className="whitespace-pre-wrap break-words">
              {messageSyncMeta.descriptionLine?.trim() ||
                messageSyncMeta.bodyPreview?.trim() ||
                messageSyncMeta.subject?.trim() ||
                "—"}
            </p>
          </div>
        ) : null}
        {messageSyncMeta?.outcome === "parse_failed" ? (
          <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-2">
            <p className="font-medium text-destructive">Parse failed</p>
            <p className="text-muted-foreground">
              Reasons:{" "}
              {messageSyncMeta.parseFailedReasons?.length
                ? messageSyncMeta.parseFailedReasons.join(", ")
                : "unknown"}
            </p>
            {messageSyncMeta.parseType ? (
              <p className="text-muted-foreground">Template attempted: {messageSyncMeta.parseType}</p>
            ) : null}
            {messageSyncMeta.parseAttempt ? (
              <pre className="text-xs rounded-md border border-border bg-muted/40 p-2 overflow-auto">
                {JSON.stringify(messageSyncMeta.parseAttempt, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
        {messageLoading ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Loading body from mailbox…</p>
            {messageSyncMeta ? (
              <div className="rounded-md border border-border p-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">From (email): </span>
                  {messageSyncMeta.fromAddress || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Subject: </span>
                  {messageSyncMeta.subject || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Received: </span>
                  {messageSyncMeta.receivedDateTime || "—"}
                </p>
              </div>
            ) : null}
          </div>
        ) : messageDetail ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">From (email): </span>
                <span className="select-all">{messageDetail.fromAddress || "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Subject: </span>
                <span className="select-all">{messageDetail.subject || "—"}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Received: </span>
                <span className="select-all">{messageDetail.receivedDateTime || "—"}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Body</p>
              <pre className="whitespace-pre-wrap text-sm rounded-md border border-border bg-muted/30 p-3 max-h-[50vh] overflow-auto select-all">
                {messageDetail.bodyContent || "—"}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data.</p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void copyMessageDebugBundle()}
            disabled={!messageSyncMeta || !messageDetail || messageLoading}
          >
            Copy debug text
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMessageDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={processMarkedSummaryOpen}
        onOpenChange={(open) => {
          setProcessMarkedSummaryOpen(open);
          if (!open) setProcessMarkedSummary(null);
        }}
        className="max-w-lg"
      >
        <DialogHeader>Process marked — summary</DialogHeader>
        {processMarkedSummary ? (
          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <p>
                <span className="text-muted-foreground">Date range (transaction dates)</span>
                <br />
                <span className="font-medium">{processMarkedSummary.dateRangeLabel}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Transactions in this run</span>{" "}
                <span className="font-medium tabular-nums">{processMarkedSummary.processedCount}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 border-y border-border py-2">
              <span>
                Accepted{" "}
                <span className="font-semibold tabular-nums">
                  {processMarkedSummary.acceptedDuplicateCount + processMarkedSummary.acceptedAddCount}
                </span>
                <span className="text-muted-foreground text-xs block sm:inline sm:ml-1">
                  ({processMarkedSummary.acceptedAddCount} new expense
                  {processMarkedSummary.acceptedAddCount === 1 ? "" : "s"},{" "}
                  {processMarkedSummary.acceptedDuplicateCount} duplicate
                  {processMarkedSummary.acceptedDuplicateCount === 1 ? "" : "s"})
                </span>
              </span>
              <span>
                Ignored{" "}
                <span className="font-semibold tabular-nums">{processMarkedSummary.ignoredCount}</span>
              </span>
              {processMarkedSummary.skippedNoCategory > 0 ? (
                <span className="text-amber-700 dark:text-amber-500">
                  Skipped (no category on row) {processMarkedSummary.skippedNoCategory}
                </span>
              ) : null}
            </div>
            {processMarkedSummary.addByCategory.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">New expenses by category</p>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1.5 pr-2 font-medium">Category</th>
                      <th className="py-1.5 pr-2 font-medium tabular-nums">Count</th>
                      <th className="py-1.5 font-medium tabular-nums">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processMarkedSummary.addByCategory.map((row) => (
                      <tr key={row.categoryName} className="border-b border-border/60">
                        <td className="py-1.5 pr-2">{row.categoryName}</td>
                        <td className="py-1.5 pr-2 tabular-nums">{row.count}</td>
                        <td className="py-1.5 tabular-nums">{formatRand(row.totalMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {(processMarkedSummary.acceptedDuplicateCount > 0 || processMarkedSummary.ignoredCount > 0) && (
              <ul className="space-y-1 text-muted-foreground">
                {processMarkedSummary.acceptedDuplicateCount > 0 ? (
                  <li>
                    Resolved as duplicate: {processMarkedSummary.acceptedDuplicateCount} ·{" "}
                    {formatRand(processMarkedSummary.duplicateMinor)}
                  </li>
                ) : null}
                {processMarkedSummary.ignoredCount > 0 ? (
                  <li>
                    Ignored: {processMarkedSummary.ignoredCount} · {formatRand(processMarkedSummary.ignoredMinor)}
                  </li>
                ) : null}
              </ul>
            )}
            <p className="text-base font-semibold border-t border-border pt-3">
              Total (all processed bank amounts){" "}
              <span className="tabular-nums">{formatRand(processMarkedSummary.totalMinor)}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No summary.</p>
        )}
        <DialogFooter>
          <Button type="button" onClick={() => setProcessMarkedSummaryOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      {syncMutation.isPending ? (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-xl border border-border bg-card p-5 shadow-lg flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
            <div className="text-sm font-medium">Syncing mailbox…</div>
            <div className="text-xs text-muted-foreground">Fetching emails in pages and matching bank templates.</div>
          </div>
        </div>
      ) : null}

      {accounts.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <SectionHeader title="Default account for new expenses" />
          <select
            className="w-full max-w-md rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={accountId === "" ? "" : String(accountId)}
            onChange={(e) => {
              const v = e.target.value;
              setAccountId(v === "" ? "" : Number(v));
            }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Used when you accept and add an expense (single row or bulk Process marked).</p>
        </section>
      ) : null}
    </div>
  );
}
