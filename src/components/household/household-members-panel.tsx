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
 * The house name and who is in it.
 *
 * Extracted from the onboarding step so Settings shows the same thing: the
 * household was something you could only see while being onboarded, and never
 * again afterwards.
 */
export function HouseholdMembersPanel({
  householdName,
  members,
  meUserId,
  emptyNote,
}: {
  householdName: string;
  /** Everyone already in the house, including you. */
  members: HouseholdMember[];
  meUserId: number;
  /** Shown when nobody else is in the house yet. */
  emptyNote?: React.ReactNode;
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
        {others.length === 0 && emptyNote ? emptyNote : null}
      </div>
    </div>
  );
}
