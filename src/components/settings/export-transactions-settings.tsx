"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadExport } from "./download-export";

export function ExportTransactionsSettings() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setMessage(null);
    setPending(true);
    try {
      const result = await downloadExport("/api/export/transactions", "homefinance-transactions.csv");
      if (result === "unauthorized") setMessage("Sign in again to export.");
      else if (result === "failed") setMessage("Export failed. Try again.");
      else setMessage("Download started.");
    } catch {
      setMessage("Export failed. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">Export transactions</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Download all of your income and expense rows as a CSV file (UTF-8, Excel-friendly). Amounts use the same
          minor units as the app (e.g. cents); the amount_major column is the decimal display value. Only the
          signed-in user&apos;s entries are included.
        </p>
      </div>
      <Button type="button" onClick={handleExport} disabled={pending}>
        {pending ? "Preparing…" : "Download CSV"}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </section>
  );
}
