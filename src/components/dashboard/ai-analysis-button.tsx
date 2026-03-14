"use client";

import { useState, useTransition } from "react";
import { analyzeExpenses } from "@/lib/actions/ai.actions";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiAnalysisButtonProps {
  month: string;
  /** When false, the button is not rendered (AI not configured). */
  enabled: boolean;
}

export function AiAnalysisButton({ month, enabled }: AiAnalysisButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!enabled) return null;

  const handleClick = () => {
    setError(null);
    setAnalysis(null);
    setExpanded(true);
    startTransition(async () => {
      const result = await analyzeExpenses(month);
      if (result.success) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error);
      }
    });
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
            <div className="whitespace-pre-wrap text-muted-foreground">{analysis}</div>
          )}
        </div>
      )}
    </section>
  );
}
