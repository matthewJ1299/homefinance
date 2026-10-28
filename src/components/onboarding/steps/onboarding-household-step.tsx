"use client";

import { Card } from "@/components/ui/card";
import { HouseholdMembersPanel } from "@/components/household/household-members-panel";
import type { HouseholdMember } from "@/lib/types/household-member";

/**
 * Step one, because most of this app is better with someone else in it and the
 * moment to say so is before anyone has typed a budget.
 */
export function OnboardingHouseholdStep({
  householdName,
  members,
  meUserId,
}: {
  householdName: string;
  /** Everyone already in the house, including you. */
  members: HouseholdMember[];
  meUserId: number;
}) {
  return (
    <div className="space-y-4">
      <HouseholdMembersPanel
        householdName={householdName}
        members={members}
        meUserId={meUserId}
        emptyNote={
          <p className="text-sm text-muted-foreground">
            It&rsquo;s just you so far. Adding someone is done for you at the moment &mdash; ask
            support to add whoever else lives here, and the shared parts start working.
          </p>
        }
      />

      {/* The most important copy in the flow. Someone being asked to put their
          financial life into an app their partner installed needs the boundary
          stated before they agree, not buried in Settings afterwards. */}
      <Card className="rounded-2xl border-primary/35 bg-primary/[0.06] p-3.5">
        <p className="text-sm font-semibold">What they&rsquo;ll see</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          The calendar, lists, shared costs, the mortgage, shared account balances and household
          totals.
        </p>
        <p className="mt-2 text-sm font-semibold">Not</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Your budget or what you earn. Those stay yours, and theirs stay theirs.
        </p>
      </Card>
    </div>
  );
}
