"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { analyzeExpenses } from "@/lib/actions/ai.actions";
import { Button } from "@/components/ui/button";
import { Copy, ListTree, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AiAnalysisButtonProps {
  month: string;
  /** When false, the button is not rendered (AI not configured). */
  enabled: boolean;
}

export function AiAnalysisButton({ month, enabled }: AiAnalysisButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inputText, setInputText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!enabled) return null;

  const runAnalysis = (includeTransactions: boolean) => {
    setError(null);
    setInputText(null);
    setExpanded(true);
    startTransition(async () => {
      const result = await analyzeExpenses(month, { includeTransactions });
      if (result.success) {
        setInputText(result.inputText);
        toast.success("Opening report…");
        router.push(`/budget-ai-report?month=${encodeURIComponent(month)}&runId=${encodeURIComponent(String(result.runId))}`);
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  };

  const openInputInNewTab = () => {
    if (!inputText || typeof window === "undefined") return;
    const escaped = inputText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>AI Analysis Input</title><style>body{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;padding:16px;line-height:1.5;white-space:pre-wrap;}pre{margin:0;}</style></head><body><pre>${escaped}</pre></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const tab = window.open(blobUrl, "_blank", "noopener,noreferrer");
    if (!tab) {
      toast.error("Could not open a new tab. Please allow pop-ups.");
      URL.revokeObjectURL(blobUrl);
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  };

  const copyInputToClipboard = async () => {
    if (!inputText || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(inputText);
      toast.success("AI input copied.");
    } catch {
      toast.error("Could not copy. Open the input tab and copy manually.");
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => runAnalysis(false)}
          disabled={isPending}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {isPending ? "Analyzing..." : "Analyze spending"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => runAnalysis(true)}
          disabled={isPending}
          className="gap-2"
        >
          <ListTree className="h-4 w-4" />
          {isPending ? "Analyzing..." : "Include all transactions"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Summary-only uses category totals and month figures (smaller request). Including all transactions helps the model suggest line-level recategorisations.
      </p>
      {expanded && (
        <div
          className={cn(
            "rounded-lg border bg-card p-3 text-sm text-card-foreground",
            error && "border-destructive/50"
          )}
        >
          {isPending && <p className="text-muted-foreground">Running analysis…</p>}
          {error && !isPending && <p className="text-destructive">{error}</p>}
          {!isPending && !error && inputText && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Last run copied the report to your browser session. Open the report page any time from here:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/budget-ai-report?month=${encodeURIComponent(month)}`)}
                >
                  Open report
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={openInputInNewTab}>
                  Open AI input in new tab
                </Button>
                <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={copyInputToClipboard}>
                  <Copy className="h-4 w-4" />
                  Copy input
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
