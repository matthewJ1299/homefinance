import { Card } from "@/components/ui/card";
import { ordinalDay } from "@/lib/utils/date";

/**
 * The joining side.
 *
 * The person accepting an invite arrives to a house that already has a budget
 * month, shared accounts and possibly a mortgage plan. Telling them what is
 * already decided -- and that their own budget is private and empty -- is the
 * difference between joining and being enrolled.
 */
export function JoinedHouseholdIntro({
  householdName,
  setUpByName,
  budgetMonthStartDay,
  sharedAccountCount,
}: {
  householdName: string;
  setUpByName: string;
  budgetMonthStartDay: number;
  sharedAccountCount: number;
}) {
  const endDay = budgetMonthStartDay === 1 ? "end of the month" : `${ordinalDay(budgetMonthStartDay - 1)}`;

  return (
    <Card className="mb-6 rounded-2xl p-4">
      <h2 className="text-lg font-semibold tracking-tight">You&rsquo;ve joined {householdName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {setUpByName} set this up. Here&rsquo;s what&rsquo;s already shared with you.
      </p>

      <dl className="mt-3 space-y-0.5">
        <div className="flex justify-between gap-3 border-b border-border/50 py-2 text-sm">
          <dt className="text-muted-foreground">Budget month</dt>
          <dd className="text-right">
            {ordinalDay(budgetMonthStartDay)} to the {endDay}
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-2 text-sm">
          <dt className="text-muted-foreground">Shared accounts</dt>
          <dd className="text-right">
            {sharedAccountCount === 0
              ? "None yet"
              : `${sharedAccountCount} shared with the house`}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm leading-relaxed">
        Your own budget is private, and empty. Let&rsquo;s set it up — about two minutes.
      </p>
    </Card>
  );
}
