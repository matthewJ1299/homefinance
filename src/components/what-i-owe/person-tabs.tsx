"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface StatementPerson {
  id: number;
  name: string;
}

/**
 * Who the statement is about. Rendered only when the household has more than
 * one other member -- with a single housemate there is nothing to choose, and
 * a one-tab tab bar is just noise.
 */
export function StatementPersonTabs({
  people,
  selectedId,
}: {
  people: StatementPerson[];
  selectedId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (people.length < 2) return null;

  function select(id: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("with", String(id));
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Person">
      {people.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={p.id === selectedId}
          onClick={() => select(p.id)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
            p.id === selectedId
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-accent/40"
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
