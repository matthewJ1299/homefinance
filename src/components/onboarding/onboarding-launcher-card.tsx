import Link from "next/link";
import { cn } from "@/lib/utils";

const linkButtonClass =
  "inline-flex items-center justify-center rounded-md font-medium h-9 px-3 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors";

export function OnboardingLauncherCard() {
  return (
    <section className="rounded-lg border bg-card p-4 space-y-2">
      <h2 className="text-sm font-medium">Household setup</h2>
      <p className="text-sm text-muted-foreground">
        Walk through accounts, payday, income, categories, and your first budget allocation.
      </p>
      <Link href="/welcome" className={linkButtonClass}>
        Open setup guide
      </Link>
    </section>
  );
}
