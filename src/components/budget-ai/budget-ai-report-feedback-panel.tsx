"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { replyToBudgetAiReport } from "@/lib/actions/budget-ai-report.actions";
import type { AIAnalysisRunMessageRow } from "@/lib/repositories/interfaces/ai-analysis-run-message.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface BudgetAiReportFeedbackPanelProps {
  runId: number;
  messages: AIAnalysisRunMessageRow[];
  enabled: boolean;
}

export function BudgetAiReportFeedbackPanel({ runId, messages, enabled }: BudgetAiReportFeedbackPanelProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [localMessages, setLocalMessages] = useState(messages);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  if (!enabled) return null;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    const optimisticUser: AIAnalysisRunMessageRow = {
      id: -Date.now(),
      runId,
      userId: 0,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimisticUser]);

    startTransition(async () => {
      const result = await replyToBudgetAiReport(runId, trimmed);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
        setLocalMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        if (result.userMessageId) {
          router.refresh();
        }
      }
    });
  };

  const displayMessages = localMessages.length >= messages.length ? localMessages : messages;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Ask about this report</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Follow-up questions are saved with this report. Rate limits apply (same as running analysis).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayMessages.length > 0 ? (
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border border-border/80 p-3">
            {displayMessages.map((m) => (
              <div
                key={m.id}
                className={`rounded-md p-2 text-sm ${
                  m.role === "user" ? "ml-4 bg-primary/10 text-card-foreground" : "mr-4 bg-muted/50 text-muted-foreground"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  {m.role === "user" ? "You" : "Coach"}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No messages yet. Ask a question about the suggestions above.</p>
        )}
        <div className="space-y-2">
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="e.g. Why reduce Groceries? Can we afford more for Savings?"
            value={text}
            disabled={isPending}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button type="button" disabled={isPending || !text.trim()} onClick={handleSend}>
            {isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
