"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadExport } from "./download-export";

/**
 * The one-file export built to be pasted or uploaded to an AI assistant and
 * asked about: the whole household's last three budget months, with names
 * next to ids and rands next to cents. See docs/export.md.
 */
export function ExportHouseholdSettings() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setMessage(null);
    setPending(true);
    try {
      const result = await downloadExport("/api/export/household", "homefinance-export.json");
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
        <h2 className="text-sm font-medium">Export for AI analysis</h2>
        <p className="text-xs text-muted-foreground mt-1">
          One JSON file with the whole household&apos;s last three budget months: expenses with category, account,
          who paid and each person&apos;s share; income; transfers between accounts; split settlements; account
          ledger rows; and a per-month summary. Every amount is given in cents and in rands, and every id comes
          with its name, so you can hand the file to Claude and ask about your spending.
        </p>
      </div>
      <Button type="button" onClick={handleExport} disabled={pending}>
        {pending ? "Preparing…" : "Download JSON"}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </section>
  );
}
