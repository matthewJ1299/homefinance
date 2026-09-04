"use client";

import type { HouseholdMember } from "@/lib/types/household-member";

/**
 * The shared/private decision, with its consequence stated at the moment it is
 * made. A privacy switch whose effect you have to guess gets left alone.
 *
 * Rendered alongside AccountCreateFields rather than inside it, so the account
 * form stays a plain field set.
 */
export function AccountSharingSwitch({
  isShared,
  onChange,
  otherMembers,
  disabled = false,
}: {
  isShared: boolean;
  onChange: (next: boolean) => void;
  otherMembers: HouseholdMember[];
  disabled?: boolean;
}) {
  if (otherMembers.length === 0) return null;

  const they = otherMembers.length === 1 ? otherMembers[0].name.split(" ")[0] : "They";
  const theyLower = otherMembers.length === 1 ? they : "they";
  const their = otherMembers.length === 1 ? `${they}'s` : "their";

  return (
    <div className="rounded-xl border border-primary/35 bg-primary/[0.06] p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Share with the house</p>
          <p className="truncate text-xs text-muted-foreground">
            {otherMembers.map((m) => m.name).join(", ")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isShared}
          aria-label="Share with the house"
          disabled={disabled}
          onClick={() => onChange(!isShared)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
            isShared ? "bg-primary" : "bg-muted border border-border"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-all ${
              isShared ? "left-6" : "left-1"
            }`}
            aria-hidden
          />
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {isShared
          ? `${they} ${otherMembers.length === 1 ? "sees" : "see"} this balance and every transaction on it. ${
              otherMembers.length === 1 ? `${they} won't` : "They won't"
            } see your budget, and ${theyLower} still assign ${their} own money to ${their} own categories.`
          : "Only you can see this account."}
      </p>
    </div>
  );
}
