"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarCircle } from "@/components/ui/avatar-circle";
import { renameHousehold } from "@/lib/actions/household.actions";
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
  const router = useRouter();
  const [name, setName] = useState(householdName);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === householdName) return;
    startTransition(async () => {
      const res = await renameHousehold(trimmed);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("House renamed.");
      router.refresh();
    });
  }

  const others = members.filter((m) => m.id !== meUserId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="household-name">House name</Label>
        <div className="flex gap-2">
          <Input
            id="household-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            placeholder="e.g. Jordaan house"
          />
          <Button onClick={save} disabled={pending || name.trim() === householdName}>
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Who&rsquo;s in it</Label>
        <Card className="rounded-2xl px-3.5 py-1.5">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-0"
            >
              <AvatarCircle name={m.name} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
              {m.id === meUserId ? (
                <span className="text-xs text-muted-foreground">You</span>
              ) : null}
            </div>
          ))}
        </Card>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            It&rsquo;s just you so far. Someone will approve your house shortly, and an
            administrator adds the other people in it — ask them to add whoever else lives here.
          </p>
        ) : null}
      </div>

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
