"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { deleteReconRule, updateReconRule } from "@/lib/actions/recon-rule.actions";
import type {
  ReconRuleMatchKind,
  ReconRuleRow,
} from "@/lib/repositories/interfaces/recon-rule.repository";
import type { HouseholdMember } from "@/lib/types/household-member";

export interface RuleSheetCategory {
  id: number;
  name: string;
  groupName: string;
}

/**
 * The one place a rule can change. Filing a spend is the Add sheet; this is
 * only match, category, and who shares the next matching spend.
 */
export function ReconRuleSheet({
  rule,
  currentUserId,
  members,
  categories,
  onOpenChange,
  onSaved,
}: {
  rule: ReconRuleRow | null;
  currentUserId: number;
  members: HouseholdMember[];
  categories: RuleSheetCategory[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = rule != null;
  const [matchKind, setMatchKind] = useState<ReconRuleMatchKind>("merchant_exact");
  const [matchValue, setMatchValue] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!rule) return;
    setMatchKind(rule.matchKind);
    setMatchValue(rule.matchValue);
    setCategoryId(rule.categoryId ?? "");
    const withOwner = rule.participantUserIds.includes(currentUserId)
      ? rule.participantUserIds
      : [currentUserId, ...rule.participantUserIds];
    setPickedIds(withOwner);
    setConfirmingRemove(false);
  }, [rule, currentUserId]);

  const grouped = useMemo(
    () => groupCategories(categoriesForSelect(categories, rule)),
    [categories, rule]
  );
  const me = members.find((m) => m.id === currentUserId);
  const others = members.filter((m) => m.id !== currentUserId);
  const roster = me ? [me, ...others] : members;
  const canSave = categoryId !== "" && matchValue.trim() !== "" && !pending;

  function save() {
    if (rule == null || categoryId === "" || pending) return;
    startTransition(async () => {
      const res = await updateReconRule(rule.id, {
        matchKind,
        matchValue,
        categoryId,
        participantUserIds: pickedIds,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Rule saved.");
      onOpenChange(false);
      onSaved();
    });
  }

  function remove() {
    if (rule == null || pending) return;
    startTransition(async () => {
      const res = await deleteReconRule(rule.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Rule removed.");
      onOpenChange(false);
      onSaved();
    });
  }

  function togglePerson(id: number) {
    if (id === currentUserId) return;
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} label="Edit rule">
      <div className="flex items-center justify-between px-4 pb-2">
        <h2 className="text-base font-semibold">Edit rule</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-2">
        <div>
          <p className="pb-1.5 text-sm font-medium">How it matches</p>
          <div
            className="flex rounded-full border border-border bg-muted p-0.5"
            role="group"
            aria-label="How it matches"
          >
            {(
              [
                ["merchant_exact", "Exact"],
                ["merchant_contains", "Contains"],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setMatchKind(kind)}
                aria-pressed={matchKind === kind}
                className={cn(
                  "min-h-9 flex-1 rounded-full px-3 text-sm font-medium transition-colors cursor-pointer",
                  matchKind === kind
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {matchKind === "merchant_exact"
              ? "Only this merchant, as the bank named it."
              : "Any merchant that includes this text. Use it for branch names and reference numbers."}
          </p>
        </div>

        <div>
          <Label htmlFor="recon-rule-merchant">Merchant</Label>
          <Input
            id="recon-rule-merchant"
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            autoComplete="off"
            className="mt-1"
          />
        </div>

        <SelectField
          id="recon-rule-category"
          label="Category"
          value={categoryId === "" ? "" : String(categoryId)}
          onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Pick a category</option>
          {grouped.map((group) => (
            <optgroup key={group.name} label={group.name}>
              {group.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>

        {others.length > 0 ? (
          <div>
            <p className="pb-1.5 text-xs font-medium text-muted-foreground">Who&rsquo;s in on this</p>
            <div className="flex flex-wrap gap-1">
              {roster.map((m) => {
                const isPicked = pickedIds.includes(m.id);
                const isYou = m.id === currentUserId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => togglePerson(m.id)}
                    disabled={isYou}
                    className="flex w-14 flex-col items-center gap-1 cursor-pointer disabled:cursor-default"
                    aria-pressed={isPicked}
                    aria-label={isYou ? "You" : m.name}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full border-2 text-[15px] font-semibold transition-colors",
                        isPicked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {initials(m.name)}
                    </span>
                    <span
                      className={cn(
                        "text-[11px]",
                        isPicked ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {isYou ? "You" : m.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Accept all splits the next matching spend evenly across whoever is in. You still
              file it.
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {confirmingRemove ? (
          <>
            <p className="text-sm text-muted-foreground">
              Remove this rule? Spends it already filed stay put.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                disabled={pending}
                onClick={() => setConfirmingRemove(false)}
              >
                Keep it
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 flex-1"
                disabled={pending}
                onClick={remove}
              >
                {pending ? "Removing…" : "Remove"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button
              type="button"
              className="h-11 w-full"
              disabled={!canSave}
              onClick={save}
            >
              {pending ? "Saving…" : "Save rule"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full text-destructive"
              disabled={pending}
              onClick={() => setConfirmingRemove(true)}
            >
              Remove
            </Button>
          </>
        )}
      </div>
    </Sheet>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function categoriesForSelect(
  categories: RuleSheetCategory[],
  rule: ReconRuleRow | null
): RuleSheetCategory[] {
  if (rule?.categoryId == null) return categories;
  if (categories.some((c) => c.id === rule.categoryId)) return categories;
  return [
    ...categories,
    {
      id: rule.categoryId,
      name: rule.categoryName ?? "Current category",
      groupName: "Current",
    },
  ];
}

function groupCategories(
  categories: RuleSheetCategory[]
): { name: string; categories: RuleSheetCategory[] }[] {
  const byGroup = new Map<string, RuleSheetCategory[]>();
  for (const c of categories) {
    const name = c.groupName.trim() || "Other";
    const list = byGroup.get(name) ?? [];
    list.push(c);
    byGroup.set(name, list);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, list]) => ({
      name,
      categories: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
