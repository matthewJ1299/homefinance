import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";

/**
 * In-context explanation instead of a guided tour. A tour is watched once and
 * forgotten; these are here the moment the question comes up.
 */
const TOPICS: Record<string, { title: string; intro: string; sections: { q: string; a: string }[] }> = {
  rollover: {
    title: "What happens to money you don't spend",
    intro:
      "One rule, both directions: what's left stays where it is, and what you overspend comes off the next month.",
    sections: [
      {
        q: "Leftovers stay in the category",
        a: "If you assign R400 to Car service and spend nothing, next month it starts with R400 already in it plus whatever you assign. That's how a category quietly turns into savings without a separate savings feature.",
      },
      {
        q: "Overspends don't follow the category",
        a: "If Groceries ends R420 over, Groceries starts the new month clean at whatever you assign it. The R420 comes off the new month's unassigned money instead, once, at the top — where you can see it and assign against it. A category that read as over budget before you'd spent a rand would make the rule impossible to explain.",
      },
      {
        q: "You can settle it at month end instead",
        a: "The New month screen offers to cover an overspend from a category with room. Do that and there's nothing left to take off the new month.",
      },
      {
        q: "Turning it off",
        a: "A category can have rollover switched off, and then it simply resets to its assigned amount every month. Useful for things like Fuel where last month's leftover isn't really savings.",
      },
    ],
  },
  equity: {
    title: "How your share of the house works",
    intro:
      "Your share is your deposit plus the part of the loan your payments have actually repaid.",
    sections: [
      {
        q: "Why the percentage is of what's paid for, not the whole house",
        a: "Early on, most of the house still belongs to the bank. Showing your share of the whole thing means a number that barely moves and reads as stalled. Your share of what's been paid for so far is true, and it moves every month.",
      },
      {
        q: "Why most of an early payment vanishes",
        a: "Interest is charged on what's still owed, so at the start the bank takes most of each payment and only a little buys ownership. That flips over the years — the same payment buys more and more.",
      },
      {
        q: "Why a deposit changes the payments",
        a: "Money put in up front is ownership bought immediately. If you both then pay the same each month, whoever put the deposit in stays ahead forever. Paying uneven amounts is what evens the shares out by the end.",
      },
      {
        q: "Why the percentage keeps changing",
        a: "It's recalculated from real balances every time, so it shifts as payments land and as the rate changes. That's the number being honest, not the app being inconsistent.",
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(TOPICS).map((topic) => ({ topic }));
}

export default async function HowThisWorksPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const content = TOPICS[topic];
  if (!content) notFound();

  return (
    <div className="p-4 pb-24 md:pb-8">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{content.title}</h1>
        <p className="text-[15px] leading-relaxed">{content.intro}</p>
        {content.sections.map((s) => (
          <Card key={s.q} className="rounded-2xl p-4">
            <p className="text-sm font-semibold">{s.q}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.a}</p>
          </Card>
        ))}
        <Link href="/dashboard" className="block pt-2 text-sm font-semibold text-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
