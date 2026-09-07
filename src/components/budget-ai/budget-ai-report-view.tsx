import type { BudgetAnalysisReport } from "@/lib/types/budget-ai-report";
import { formatRand } from "@/lib/utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {items.map((item, i) => (
            <li key={`${i}-${item.slice(0, 24)}`}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function confidenceClass(c: string): string {
  if (c === "high") return "text-success";
  if (c === "medium") return "text-warning";
  return "text-muted-foreground";
}

export function BudgetAiReportView({ report }: { report: BudgetAnalysisReport }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-card-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      <ListSection title="Top issues" items={report.top_issues} />

      {(report.allocation_changes?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Suggested budget changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {report.allocation_changes.map((a, i) => (
              <div key={i} className="rounded-md border border-border/80 bg-muted/30 p-3">
                <p className="font-medium text-card-foreground">
                  {a.category_name}: {formatRand(a.new_allocated_cents)}
                </p>
                {a.reason ? <p className="mt-1 text-muted-foreground">{a.reason}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.recommended_moves.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recommended moves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {report.recommended_moves.map((m, i) => (
              <div key={i} className="rounded-md border border-border/80 bg-muted/30 p-3">
                <p className="font-medium text-card-foreground">
                  {m.from_category} to {m.to_category}: {formatRand(m.amount_cents)}
                </p>
                {m.reason ? <p className="mt-1 text-muted-foreground">{m.reason}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.recategorisations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recategorisations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {report.recategorisations.map((r, i) => (
              <div key={i} className="rounded-md border border-border/80 p-3">
                <p className="font-medium text-card-foreground">{r.transaction_hint}</p>
                <p className="mt-1 text-muted-foreground">
                  {r.current_category} to {r.suggested_category}
                </p>
                <p className={`mt-1 text-xs font-medium uppercase tracking-wide ${confidenceClass(r.confidence)}`}>
                  Confidence: {r.confidence}
                </p>
                {r.reason ? <p className="mt-1 text-muted-foreground">{r.reason}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {report.new_categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">New categories to consider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.new_categories.map((c, i) => (
              <div key={i}>
                <p className="font-medium text-card-foreground">{c.name}</p>
                {c.reason ? <p className="text-muted-foreground">{c.reason}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ListSection title="Next month plan" items={report.next_month_plan} />
      <ListSection title="Data issues" items={report.data_issues} />
    </div>
  );
}
