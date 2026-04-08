"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Label } from "@/components/ui/label";
import { SectionHeader } from "@/components/ui/section-header";
import { formatRand } from "@/lib/utils/currency";
import { parseAccountsApiPayload } from "@/lib/utils/accounts-api";
import type { Category } from "@/lib/types";
import type { ReconImportItemRow } from "@/lib/repositories/interfaces/recon-import-item.repository";
import type { ExpenseWithDetails } from "@/lib/types";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const msg = typeof data === "object" && data && "error" in data && typeof data.error === "string" ? data.error : res.statusText;
    throw new Error(msg);
  }
  return data as T;
}

export function ReconPageClient() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [categoryByItemId, setCategoryByItemId] = useState<Record<number, number | "">>({});
  const [splitByItemId, setSplitByItemId] = useState<Record<number, boolean>>({});
  const [accountId, setAccountId] = useState<number | "">("");
  const [syncSince, setSyncSince] = useState<string>("");
  const [syncDebug, setSyncDebug] = useState<
    null | {
      truncated: boolean;
      messages: Array<{
        graphMessageId: string;
        receivedDateTime: string;
        fromAddress: string;
        subject: string;
        bodyPreview?: string;
        outcome: "not_bank" | "parse_failed" | "imported_pending_add" | "imported_pending_duplicate";
        parseType?: string;
        matchedExpenseCount?: number;
      }>;
    }
  >(null);
  const [debugPage, setDebugPage] = useState(1);
  const debugPageSize = 25;
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageDetail, setMessageDetail] = useState<null | {
    id: string;
    subject: string;
    fromAddress: string;
    receivedDateTime: string;
    bodyContent: string;
  }>(null);
  const [matchesDialogOpen, setMatchesDialogOpen] = useState(false);
  const [matchesForItemId, setMatchesForItemId] = useState<number | null>(null);
  const [matchedExpenses, setMatchedExpenses] = useState<ExpenseWithDetails[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);

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
    queryFn: () => fetchJson<{ connected: boolean; msAccountEmail: string | null }>("/api/recon/graph/status"),
  });

  const itemsQuery = useQuery({
    queryKey: ["recon-items"],
    queryFn: () => fetchJson<{ items: ReconImportItemRow[] }>("/api/recon/items"),
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

  const items = itemsQuery.data?.items ?? [];
  const categories = categoriesQuery.data?.categories ?? [];
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

  const syncMutation = useMutation({
    mutationFn: () =>
      fetchJson<{ imported: number; scanned: number; debug?: { truncated: boolean; messages: unknown[] } }>("/api/recon/sync", {
        method: "POST",
        body: JSON.stringify({ since: syncSince || undefined, debug: true }),
      }),
    onSuccess: (data) => {
      toast.success(`Synced: ${data.imported} bank email(s) matched.`);
      if (data.debug && typeof data.debug === "object") {
        setSyncDebug(data.debug as typeof syncDebug);
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

  const setCategory = useCallback((itemId: number, value: number | "") => {
    setCategoryByItemId((p) => ({ ...p, [itemId]: value }));
  }, []);

  const setSplit = useCallback((itemId: number, value: boolean) => {
    setSplitByItemId((p) => ({ ...p, [itemId]: value }));
  }, []);

  const effectiveCategory = useCallback(
    (item: ReconImportItemRow): number | "" => {
      const v = categoryByItemId[item.id];
      if (v !== undefined && v !== "") return v;
      return item.suggestedCategoryId ?? "";
    },
    [categoryByItemId]
  );

  const openMatches = useCallback(async (item: ReconImportItemRow) => {
    const ids = item.matchedExpenseIds ?? [];
    if (!ids.length) {
      toast.message("No matches stored for this row.");
      return;
    }
    setMatchesForItemId(item.id);
    setMatchesDialogOpen(true);
    setMatchesLoading(true);
    setMatchedExpenses(null);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetchJson<{ expense: ExpenseWithDetails }>(`/api/expenses/${id}`, { method: "GET" }).then(
            (r) => r.expense
          )
        )
      );
      setMatchedExpenses(results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load matches.");
      setMatchedExpenses([]);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  const openMessage = useCallback(async (graphMessageId: string) => {
    setMessageDialogOpen(true);
    setMessageLoading(true);
    setMessageDetail(null);
    try {
      const data = await fetchJson<{ message: { id: string; subject: string; fromAddress: string; receivedDateTime: string; bodyContent: string } }>(
        `/api/recon/messages/${encodeURIComponent(graphMessageId)}`
      );
      setMessageDetail(data.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load email body.");
      setMessageDetail({
        id: graphMessageId,
        subject: "",
        fromAddress: "",
        receivedDateTime: "",
        bodyContent: "",
      });
    } finally {
      setMessageLoading(false);
    }
  }, []);

  const statusLabel = (s: ReconImportItemRow["status"]): string => {
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
            <Button
              type="button"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={!connected || syncMutation.isPending}
            >
              {syncMutation.isPending ? "Syncing…" : "Sync from mailbox"}
            </Button>
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
          <p className="text-xs text-muted-foreground">
            Limits mailbox scanning to messages received on/after this date.
          </p>
        </div>
      </section>

      {syncDebug ? (
        <CollapsibleSection
          title={`Fetched emails (${syncDebug.messages.length}${syncDebug.truncated ? "+" : ""})`}
        >
          <p className="text-xs text-muted-foreground mb-3">
            Highlighting: green = imported, amber = imported + duplicate, red = matched bank template but parse failed.
            {syncDebug.truncated ? " (List is truncated.)" : ""}
          </p>
          {(() => {
            const total = syncDebug.messages.length;
            const totalPages = Math.max(1, Math.ceil(total / debugPageSize));
            const safePage = Math.min(Math.max(1, debugPage), totalPages);
            const start = (safePage - 1) * debugPageSize;
            const pageRows = syncDebug.messages.slice(start, start + debugPageSize);
            const canPrev = safePage > 1;
            const canNext = safePage < totalPages;
            return (
              <div className="space-y-3">
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
                              ? "Bank match but parse failed"
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
                                onClick={() => void openMessage(m.graphMessageId)}
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
              </div>
            );
          })()}
        </CollapsibleSection>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <SectionHeader title="Pending items" />
        {itemsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending recon items. Sync after connecting Outlook.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Vendor</th>
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 font-medium tabular-nums">Amount</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Split</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const cat = effectiveCategory(item);
                  const canAdd = typeof cat === "number" && cat > 0;
                  const acc =
                    accountId === "" ? undefined : typeof accountId === "number" ? accountId : undefined;
                  const split = splitByItemId[item.id] ?? false;
                  return (
                    <tr key={item.id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-3 whitespace-nowrap">{item.txnDate}</td>
                      <td className="py-3 pr-3 max-w-[200px]">
                        <span className="line-clamp-2" title={item.vendor}>
                          {item.vendor}
                        </span>
                      </td>
                      <td className="py-3 pr-3 max-w-[260px]">
                        <span
                          className="line-clamp-2 text-muted-foreground"
                          title={item.rawSubject ?? item.rawBodyPreview ?? undefined}
                        >
                          {item.rawSubject ?? item.rawBodyPreview ?? "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{formatRand(item.amount)}</td>
                      <td className="py-3 pr-3">{statusLabel(item.status)}</td>
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
                          {item.matchedExpenseIds?.length ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => void openMatches(item)}
                            >
                              View matches ({item.matchedExpenseIds.length})
                            </Button>
                          ) : null}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={matchesDialogOpen}
        onOpenChange={(open) => {
          setMatchesDialogOpen(open);
          if (!open) {
            setMatchesForItemId(null);
            setMatchedExpenses(null);
            setMatchesLoading(false);
          }
        }}
      >
        <DialogHeader>Matched expenses{matchesForItemId != null ? ` (recon #${matchesForItemId})` : ""}</DialogHeader>
        {matchesLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : matchedExpenses && matchedExpenses.length > 0 ? (
          <div className="space-y-2">
            {matchedExpenses.map((e) => (
              <div key={e.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.categoryName}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.date} · {e.note?.trim() ? e.note : "—"}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums whitespace-nowrap">{formatRand(e.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No matches found.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setMatchesDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={messageDialogOpen}
        onOpenChange={(open) => {
          setMessageDialogOpen(open);
          if (!open) {
            setMessageLoading(false);
            setMessageDetail(null);
          }
        }}
        className="max-w-3xl"
      >
        <DialogHeader>Email</DialogHeader>
        {messageLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : messageDetail ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">{messageDetail.subject || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {messageDetail.receivedDateTime || "—"} · {messageDetail.fromAddress || "—"}
              </p>
            </div>
            <pre className="whitespace-pre-wrap text-sm rounded-md border border-border bg-muted/30 p-3 max-h-[60vh] overflow-auto">
{messageDetail.bodyContent || "—"}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setMessageDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>

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
          <p className="text-xs text-muted-foreground">Used when you click Accept and add.</p>
        </section>
      ) : null}
    </div>
  );
}
