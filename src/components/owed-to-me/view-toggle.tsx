"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { OwedStatementView } from "./statement-view";

export function StatementViewToggle({ current }: { current: OwedStatementView }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (view: OwedStatementView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "owed") {
      params.delete("view");
    } else {
      params.set("view", "owing");
    }
    const query = params.toString();
    router.push(query ? `/owed-to-me?${query}` : "/owed-to-me");
    router.refresh();
  };

  return (
    <div className="flex rounded-md border border-input p-0.5 print:hidden w-fit">
      <button
        type="button"
        onClick={() => setView("owed")}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer",
          current === "owed"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Owed to me
      </button>
      <button
        type="button"
        onClick={() => setView("owing")}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer",
          current === "owing"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        What I owe
      </button>
    </div>
  );
}
