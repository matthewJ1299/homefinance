"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Delete } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatRand } from "@/lib/utils/currency";
import {
  sharesFromRatios,
  solveShares,
  validateParticipantShares,
  type SplitMode,
} from "@/lib/services/finance/participants";
import { addExpenseWithParticipants, deleteExpense } from "@/lib/actions/expense.actions";
import { addIncome } from "@/lib/actions/income.actions";
import type { HouseholdMember } from "@/lib/types/household-member";
import { INCOME_KINDS, type IncomeKind } from "@/lib/types/income-type";

export interface AddSheetCategory {
  id: number;
  name: string;
  groupName: string;
  /** assigned + carried in - spent. Negative means over. */
  available: number;
  /** How often this category has been used. Drives pill order. */
  useCount?: number;
}

export interface AddSheetPrefill {
  categoryId?: number;
  /** Who to pre-select besides you: a list's members, an event's attendees. */
  participantIds?: number[];
  amountMinor?: number;
  note?: string;
  tab?: "spend" | "income";
  /** Runs after a successful save. Used to clear a list's ticked items. */
  onSaved?: () => void | Promise<void>;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

/** Short form for a pill: cents do not survive an 11px slot. */
function short(minor: number): string {
  return `R${Math.round(Math.abs(minor) / 100).toLocaleString("en-ZA")}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function othersLabel(others: { userId: number }[], members: HouseholdMember[]): string {
  const names = others
    .map((o) => members.find((m) => m.id === o.userId)?.name.split(" ")[0])
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return "They";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function AddSheet({
  open,
  onOpenChange,
  me,
  members,
  categories,
  accounts,
  defaultAccountId,
  defaultDate,
  prefill = {},
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  me: HouseholdMember;
  members: HouseholdMember[];
  categories: AddSheetCategory[];
  accounts: { id: number; name: string; ownerUserId: number }[];
  defaultAccountId?: number;
  defaultDate: string;
  prefill?: AddSheetPrefill;
}) {
  const [tab, setTab] = useState<"spend" | "income">("spend");
  const [entry, setEntry] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [pickedIds, setPickedIds] = useState<number[]>([me.id]); // "just me" default
  // Even by default: most shared spends are. The other two modes exist because
  // "we split it 80/20" and "I owe 560, they owe 140" are both things people
  // say, and neither survives being rounded into an even split.
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  /** Exact mode: shares the user has typed or dragged. */
  const [pinned, setPinned] = useState<Record<number, number>>({});
  /** Raw text per person, so a half-typed "5" does not snap to R5. */
  const [shareText, setShareText] = useState<Record<number, string>>({});
  /** Ratio mode: relative weights, defaulting to equal. */
  const [ratios, setRatios] = useState<Record<number, string>>({});
  const [accountId, setAccountId] = useState<number | undefined>(defaultAccountId);
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [incomeKind, setIncomeKind] = useState<IncomeKind>("salary");
  const [pending, startTransition] = useTransition();

  // Each opening is a fresh entry, minus whatever the caller prefilled. Keyed
  // off `open` rather than `prefill` because that is a new object every render.
  useEffect(() => {
    if (!open) return;
    setTab(prefill.tab ?? "spend");
    setEntry(prefill.amountMinor ? (prefill.amountMinor / 100).toFixed(2) : "");
    setCategoryId(prefill.categoryId ?? null);
    setPickedIds([me.id, ...(prefill.participantIds ?? []).filter((id) => id !== me.id)]);
    setSplitMode("even");
    setPinned({});
    setShareText({});
    setRatios({});
    setAccountId(defaultAccountId);
    setDate(defaultDate);
    setNote(prefill.note ?? "");
    setNoteOpen(Boolean(prefill.note));
    setIncomeKind("salary");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const amountMinor = useMemo(() => {
    const n = Number(entry.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }, [entry]);

  const participants = useMemo(() => {
    if (splitMode === "ratio") {
      const weights: Record<number, number> = {};
      for (const id of pickedIds) {
        const n = Number((ratios[id] ?? "").replace(",", "."));
        weights[id] = Number.isFinite(n) && n >= 0 ? n : 0;
      }
      // Nothing typed yet reads as equal, which is where the mode starts.
      const anySet = pickedIds.some((id) => (ratios[id] ?? "").trim() !== "");
      if (!anySet) return solveShares(amountMinor, pickedIds, {});
      return sharesFromRatios(amountMinor, weights);
    }
    // Only pins for people still picked; dropping someone must not keep their
    // share reserved.
    const active: Record<number, number> = {};
    if (splitMode === "exact") {
      for (const id of pickedIds) if (pinned[id] != null) active[id] = pinned[id];
    }
    return solveShares(amountMinor, pickedIds, active);
  }, [amountMinor, pickedIds, pinned, ratios, splitMode]);

  const sharesTotal = participants.reduce((sum, p) => sum + p.shareMinor, 0);
  /** Non-zero only when every share is typed and they do not add up. */
  const shareGap = amountMinor > 0 ? amountMinor - sharesTotal : 0;

  const myShare = participants.find((p) => p.userId === me.id)?.shareMinor ?? 0;
  const category = categories.find((c) => c.id === categoryId) ?? null;

  // Most-used first, then overspent, then the rest.
  const orderedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        const used = (b.useCount ?? 0) - (a.useCount ?? 0);
        if (used !== 0) return used;
        const over = Number(b.available < 0) - Number(a.available < 0);
        if (over !== 0) return over;
        return a.name.localeCompare(b.name);
      }),
    [categories]
  );

  // The consequence panel. This is the whole point of the sheet: the budget
  // effect is visible before the save, not in a toast afterwards.
  const consequence = useMemo(() => {
    if (!category) {
      return {
        tone: "neutral" as const,
        title: "Pick a category",
        body: "Each pill shows what's left in it.",
      };
    }
    if (amountMinor <= 0) {
      return {
        tone: "neutral" as const,
        title: "Type an amount",
        body: `${category.name} has ${formatRand(Math.abs(category.available))} ${
          category.available < 0 ? "over already" : "left"
        }.`,
      };
    }
    const after = category.available - myShare;
    const whose =
      pickedIds.length > 1 ? `Your ${formatRand(myShare)}` : `The full ${formatRand(amountMinor)}`;
    const others = participants.filter((p) => p.userId !== me.id);
    const owed = others.reduce((s, p) => s + p.shareMinor, 0);
    const tail = others.length
      ? ` ${othersLabel(others, members)} ${others.length > 1 ? "owe" : "owes"} you ${formatRand(owed)}.`
      : "";
    return after < 0
      ? {
          tone: "bad" as const,
          title: `${whose} comes off ${category.name}`,
          body: `It goes ${formatRand(Math.abs(after))} over.${tail}`,
        }
      : {
          tone: "good" as const,
          title: `${whose} comes off ${category.name}`,
          body: `${category.name} will have ${formatRand(after)} left.${tail}`,
        };
  }, [category, amountMinor, myShare, participants, pickedIds.length, me.id, members]);

  const canSave =
    amountMinor > 0 &&
    (tab === "income" || categoryId != null) &&
    shareGap === 0 &&
    !pending;

  function press(key: string) {
    setEntry((prev) => {
      if (key === "back") return prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : prev === "" ? "0." : `${prev}.`;
      const decimals = prev.split(".")[1];
      if (decimals != null && decimals.length >= 2) return prev;
      if (prev === "0") return key;
      return prev + key;
    });
  }

  function togglePerson(id: number) {
    if (id === me.id) return; // you are always in on your own spend
    // Changing who is in re-evens the split. Keeping the old shares would
    // produce a division nobody chose.
    setSplitMode("even");
    setPinned({});
    setShareText({});
    setRatios({});
    setPickedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function setShare(userId: number, text: string) {
    setShareText((prev) => ({ ...prev, [userId]: text }));
    const trimmed = text.trim();
    if (trimmed === "") {
      // Clearing a field hands that person back to the even split.
      setPinned((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }
    const n = Number(trimmed.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return;
    setPinned((prev) => ({ ...prev, [userId]: Math.round(n * 100) }));
  }

  function dragShare(userId: number, shareMinor: number) {
    setPinned((prev) => ({ ...prev, [userId]: shareMinor }));
    setShareText((prev) => ({ ...prev, [userId]: (shareMinor / 100).toFixed(2) }));
  }

  function changeMode(next: SplitMode) {
    setSplitMode(next);
    setPinned({});
    setShareText({});
    setRatios({});
  }

  function save() {
    if (!canSave) return;
    startTransition(async () => {
      if (tab === "income") {
        const res = await addIncome({
          amount: amountMinor,
          incomeKind,
          description: note || null,
          date,
          accountId,
        });
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(`Added ${formatRand(amountMinor)} in.`);
        await prefill.onSaved?.();
        onOpenChange(false);
        return;
      }

      const valid = validateParticipantShares(amountMinor, participants, me.id);
      if (!valid.ok) {
        toast.error(valid.error);
        return;
      }

      const res = await addExpenseWithParticipants({
        categoryId: categoryId!,
        amount: amountMinor,
        date,
        note: note || null,
        accountId,
        participants,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      // One toast, not three. The old flow fired saved, remaining and
      // over-budget separately for a single action.
      const left = res.budgetRemaining ?? 0;
      toast.success(
        `Saved ${formatRand(res.myShare ?? amountMinor)} to ${res.categoryName}. ` +
          (res.isOverspent
            ? `It's now ${formatRand(Math.abs(left))} over.`
            : `${formatRand(left)} left.`),
        {
          action: {
            label: "Undo",
            onClick: () => {
              if (res.id != null) void deleteExpense(res.id);
            },
          },
        }
      );
      await prefill.onSaved?.();
      onOpenChange(false);
    });
  }

  const roster = [me, ...members];
  const showShares = pickedIds.length > 1 && tab === "spend";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} label="Add">
      <div className="flex items-center justify-between px-4 pb-2">
        <h2 className="text-base font-semibold">Add</h2>
        <div className="flex rounded-full border border-border bg-muted p-0.5" role="tablist">
          {(["spend", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "min-h-9 rounded-full px-4 text-sm font-medium capitalize transition-colors cursor-pointer",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        <div
          className={cn(
            "py-3 text-center text-5xl font-semibold tabular-nums",
            amountMinor > 0 ? "text-foreground" : "text-muted-foreground"
          )}
          aria-live="polite"
        >
          {formatRand(amountMinor)}
        </div>
        {/* The keypad is buttons, so this carries the value for assistive tech
            without summoning the OS keyboard and eating half the sheet. */}
        <label className="sr-only" htmlFor="add-amount">
          Amount
        </label>
        <input id="add-amount" className="sr-only" readOnly value={entry} tabIndex={-1} />

        {tab === "spend" ? (
          <>
            <div className="flex flex-wrap gap-2 pb-3">
              {orderedCategories.map((c) => {
                const isSelected = c.id === categoryId;
                const isOver = c.available < 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : isOver
                          ? "border-destructive/50 bg-destructive/[0.08] text-destructive"
                          : "border-border bg-muted text-foreground"
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="text-[11px] tabular-nums opacity-75">
                      {isOver ? `${short(c.available)} over` : `${short(c.available)} left`}
                    </span>
                  </button>
                );
              })}
            </div>

            {members.length > 0 ? (
              <div className="pb-3">
                <div className="pb-1.5 text-xs font-medium text-muted-foreground">
                  Who&rsquo;s in on this
                </div>
                <div className="flex flex-wrap gap-1">
                  {roster.map((m) => {
                    const isPicked = pickedIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => togglePerson(m.id)}
                        disabled={m.id === me.id}
                        className="flex w-14 flex-col items-center gap-1 cursor-pointer disabled:cursor-default"
                        aria-pressed={isPicked}
                        // The initials are decorative; without this the name
                        // reads as "SY Sydney" to a screen reader.
                        aria-label={m.id === me.id ? "You" : m.name}
                      >
                        {/* Deliberately not AvatarCircle: that hue-hashes its own
                            colours, which fights the picked/unpicked state this
                            control depends on. */}
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
                          {m.id === me.id ? "You" : m.name.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {showShares ? (
              <div className="space-y-2 pb-3" data-testid="share-editor">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Who owes what</span>
                  <div
                    className="flex rounded-full border border-border bg-muted p-0.5"
                    role="group"
                    aria-label="How to split it"
                  >
                    {(
                      [
                        ["even", "Evenly"],
                        ["ratio", "By share"],
                        ["exact", "Exact amounts"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => changeMode(mode)}
                        aria-pressed={splitMode === mode}
                        className={cn(
                          "min-h-9 rounded-full px-3 text-xs font-medium transition-colors cursor-pointer",
                          splitMode === mode
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {participants.map((p) => {
                  const name =
                    p.userId === me.id
                      ? "You"
                      : (members.find((m) => m.id === p.userId)?.name ?? "?");
                  const pct = amountMinor > 0 ? (p.shareMinor / amountMinor) * 100 : 0;
                  const isSet = pinned[p.userId] != null;
                  return (
                    <div key={p.userId} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 truncate text-xs text-muted-foreground">
                        {name}
                      </span>
                      {splitMode === "ratio" ? (
                        <>
                          {/* Weights, not percentages that must total 100:
                              "2 to 1" is easier to say than "67 and 33", and
                              the ratio splitter makes both add up exactly. */}
                          <input
                            inputMode="decimal"
                            placeholder="1"
                            value={ratios[p.userId] ?? ""}
                            onChange={(ev) =>
                              setRatios((prev) => ({ ...prev, [p.userId]: ev.target.value }))
                            }
                            aria-label={`${name} share of the split`}
                            className="h-11 w-16 shrink-0 rounded-lg border border-border bg-card px-2 text-right text-sm tabular-nums"
                          />
                          <span className="min-w-0 flex-1 text-right text-sm tabular-nums">
                            {formatRand(p.shareMinor)}
                          </span>
                        </>
                      ) : splitMode === "exact" ? (
                        <>
                          <input
                            type="range"
                            min={0}
                            max={amountMinor}
                            step={1}
                            value={p.shareMinor}
                            aria-label={`${name} share slider`}
                            onChange={(ev) => dragShare(p.userId, Number(ev.target.value))}
                            className="h-11 min-w-0 flex-1 cursor-pointer"
                          />
                          {/* Typed, not only dragged: a slider cannot land on
                              R560 without a fight, and R560 is a number people
                              mean exactly. Whoever you have not typed absorbs
                              the rest. */}
                          <input
                            inputMode="decimal"
                            value={shareText[p.userId] ?? (p.shareMinor / 100).toFixed(2)}
                            onChange={(ev) => setShare(p.userId, ev.target.value)}
                            aria-label={`${name} share`}
                            className={cn(
                              "h-11 w-24 shrink-0 rounded-lg border bg-card px-2 text-right text-sm tabular-nums",
                              isSet ? "border-primary font-semibold" : "border-border"
                            )}
                          />
                        </>
                      ) : (
                        <span className="min-w-0 flex-1 text-right text-sm tabular-nums">
                          {formatRand(p.shareMinor)}
                        </span>
                      )}
                      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  );
                })}
                {/* The remainder cent stays visible in the per-person figures:
                    three people on R100 means someone pays 34c, and "R33,33
                    each" is a lie. */}
                {shareGap !== 0 ? (
                  <p className="text-xs font-medium text-destructive" role="alert">
                    {shareGap > 0
                      ? `${formatRand(shareGap)} still to account for.`
                      : `${formatRand(-shareGap)} more than the total.`}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                // min-h matters: without it the keypad jumps as the text length changes.
                "min-h-[50px] rounded-xl border px-3 py-2 text-sm",
                consequence.tone === "good"
                  ? "border-success/30 bg-success-surface text-success"
                  : consequence.tone === "bad"
                    ? "border-destructive/40 bg-destructive/[0.08] text-destructive"
                    : "border-border bg-muted text-muted-foreground"
              )}
              aria-live="polite"
            >
              <div className="font-medium">{consequence.title}</div>
              <div className="opacity-90">{consequence.body}</div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2 pb-3">
            {INCOME_KINDS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setIncomeKind(t.value)}
                aria-pressed={incomeKind === t.value}
                className={cn(
                  "min-h-11 rounded-full border px-3.5 text-sm font-medium cursor-pointer",
                  incomeKind === t.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 py-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
            className="min-h-11 rounded-full border border-border bg-muted px-3 text-sm cursor-pointer"
          />
          {accounts.length > 0 ? (
            <select
              value={accountId ?? ""}
              onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : undefined)}
              aria-label="Account"
              className="min-h-11 rounded-full border border-border bg-muted px-3 text-sm cursor-pointer"
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {/* Somebody else's account, shared with the household. Saying
                      so is the difference between "Joint" and a name you do
                      not recognise in your own account list. */}
                  {a.ownerUserId === me.id ? a.name : `${a.name} · shared`}
                </option>
              ))}
            </select>
          ) : null}
          {noteOpen ? (
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note"
              aria-label="Note"
              className="min-h-11 min-w-32 flex-1 rounded-full border border-border bg-muted px-3 text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="min-h-11 rounded-full border border-border bg-muted px-3.5 text-sm cursor-pointer"
            >
              + Note
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "back" ? "Delete" : k}
              className="flex h-12 items-center justify-center rounded-xl bg-muted text-lg font-medium tabular-nums cursor-pointer touch-manipulation active:bg-accent"
            >
              {k === "back" ? <Delete className="h-5 w-5" aria-hidden /> : k}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="mt-3 w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {shareGap !== 0
            ? "Shares don't add up"
            : !canSave
              ? tab === "income"
                ? "Save money in"
                : "Save spend"
              : tab === "income"
                ? `Save ${formatRand(amountMinor)} in`
                : pickedIds.length > 1
                  ? `Save · your share ${formatRand(myShare)}`
                  : `Save ${formatRand(amountMinor)}`}
        </button>
      </div>
    </Sheet>
  );
}
