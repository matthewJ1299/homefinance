"use client";

import { useState, useTransition } from "react";
import { analyzeExpenses } from "@/lib/actions/ai.actions";
import { Button } from "@/components/ui/button";
import { Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AiAnalysisButtonProps {
  month: string;
  /** When false, the button is not rendered (AI not configured). */
  enabled: boolean;
}

export function AiAnalysisButton({ month, enabled }: AiAnalysisButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [inputText, setInputText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!enabled) return null;

  const handleClick = () => {
    setError(null);
    setAnalysis(null);
    setInputText(null);
    setExpanded(true);
    startTransition(async () => {
      const result = await analyzeExpenses(month);
      if (result.success) {
        setAnalysis(result.analysis);
        setInputText(result.inputText);
        toast.success("Analysis ready.");
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        {isPending ? "Analyzing..." : "Analyze spending"}
      </Button>
      {expanded && (
        <div
          className={cn(
            "rounded-lg border bg-card p-3 text-sm text-card-foreground",
            error && "border-destructive/50"
          )}
        >
          {isPending && <p className="text-muted-foreground">Loading analysis...</p>}
          {error && !isPending && <p className="text-destructive">{error}</p>}
          {analysis && !isPending && (
            <div className="space-y-3">
              {inputText && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={openInputInNewTab}>
                    Open AI input in new tab
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={copyInputToClipboard}>
                    <Copy className="h-4 w-4" />
                    Copy input
                  </Button>
                </div>
              )}
              <div className="whitespace-pre-wrap text-muted-foreground">{analysis}</div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
