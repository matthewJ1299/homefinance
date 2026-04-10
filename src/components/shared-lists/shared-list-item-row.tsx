"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateListItem, deleteListItem, setListItemNote } from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import type { Note } from "@/lib/types/note";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LinkifiedText } from "./linkified-text";

const SUBTITLE_MAX_CHARS = 96;

function combineNoteBodies(notes: Note[]): string {
  return notes
    .map((n) => n.body)
    .join("\n\n")
    .trim();
}

function truncateSubtitle(text: string, maxChars: number): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxChars) return singleLine;
  return `${singleLine.slice(0, Math.max(0, maxChars - 1))}\u2026`;
}

interface SharedListItemRowProps {
  item: SharedListItem;
  /** Current user's notes for this item (from `notesByItemId`). */
  notes?: Note[];
  /** When set, shows a compact date chip (e.g. from createdAt). */
  dateLabel?: string;
  /** When set, chevron links to the list detail page. */
  listId?: number;
  onOptimisticUpsertItem?: (next: SharedListItem) => () => void;
  onOptimisticRemoveItem?: (item: SharedListItem) => () => void;
  /** Optional drag handle / decorator rendered before the complete control (e.g. sortable grip). */
  leadingControl?: ReactNode;
  /** Attach sortable ref to the outer row. */
  rowRef?: Ref<HTMLLIElement>;
  rowStyle?: CSSProperties;
  rowExtraClassName?: string;
}

export function SharedListItemRow({
  item,
  notes: notesProp,
  dateLabel,
  listId,
  onOptimisticUpsertItem,
  onOptimisticRemoveItem,
  leadingControl,
  rowRef,
  rowStyle,
  rowExtraClassName,
}: SharedListItemRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notePending, startNoteTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  /** Textarea is shown only after tapping the read-only note preview (fixes tall mobile layout). */
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const isTemp = item.id < 0;

  const combinedNoteText = useMemo(
    () => combineNoteBodies(notesProp ?? []),
    [notesProp]
  );
  const subtitle =
    combinedNoteText.length > 0
      ? truncateSubtitle(combinedNoteText, SUBTITLE_MAX_CHARS)
      : null;

  const [draft, setDraft] = useState(combinedNoteText);
  useEffect(() => {
    setDraft(combinedNoteText);
  }, [combinedNoteText]);

  useEffect(() => {
    if (!expanded) setShowNoteEditor(false);
  }, [expanded]);

  const handleToggleComplete = () => {
    startTransition(async () => {
      if (isTemp) return;
      const rollback = onOptimisticUpsertItem?.({ ...item, completed: !item.completed });
      const result = await updateListItem(item.id, { completed: !item.completed });
      if (result.success) {
        toast.success("Item updated.");
        void router.refresh();
      } else {
        rollback?.();
        toast.error(result.error);
      }
    });
  };

  const handleQuantityChange = (delta: number) => {
    const next = item.quantity + delta;
    if (next < 1) return;
    startTransition(async () => {
      if (isTemp) return;
      const rollback = onOptimisticUpsertItem?.({ ...item, quantity: next });
      const result = await updateListItem(item.id, { quantity: next });
      if (result.success) {
        toast.success("Item updated.");
        void router.refresh();
      } else {
        rollback?.();
        toast.error(result.error);
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${item.label}"?`)) return;
    startTransition(async () => {
      if (isTemp) return;
      const rollback = onOptimisticRemoveItem?.(item);
      const result = await deleteListItem(item.id);
      if (result.success) {
        toast.success("Item deleted.");
        void router.refresh();
      } else {
        rollback?.();
        toast.error(result.error);
      }
    });
  };

  const handleSaveNote = () => {
    if (isTemp) return;
    startNoteTransition(async () => {
      const result = await setListItemNote(item.id, draft);
      if (result.success) {
        toast.success("Note saved.");
        setShowNoteEditor(false);
        void router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleCancelNoteEdit = () => {
    setDraft(combinedNoteText);
    setShowNoteEditor(false);
  };

  return (
    <li
      ref={rowRef}
      style={rowStyle}
      className={cn(
        "flex flex-col rounded-xl border border-border/60 bg-background/40 transition-colors",
        item.completed && "opacity-75",
        rowExtraClassName
      )}
    >
      <div className="flex items-center gap-2 p-3">
        {leadingControl}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={isPending || isTemp}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors cursor-pointer",
            item.completed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary/50"
          )}
          aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        >
          {item.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
        </button>

        {isTemp ? (
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "font-medium text-sm",
                  item.completed && "line-through text-muted-foreground"
                )}
              >
                {item.label}
              </span>
              {dateLabel ? (
                <span className="text-[10px] font-medium uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {dateLabel}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "min-w-0 flex-1 rounded-lg py-0.5 text-left transition-colors",
              "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse note" : "Expand note"}
          >
            <div className="flex items-start gap-1.5 pr-1">
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground mt-0.5 transition-transform",
                  expanded && "rotate-180"
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "font-medium text-sm",
                      item.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {dateLabel ? (
                    <span className="text-[10px] font-medium uppercase tracking-wide rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                      {dateLabel}
                    </span>
                  ) : null}
                </div>
                {subtitle ? (
                  <p className="text-xs text-muted-foreground mt-1 min-w-0 max-w-full line-clamp-1 overflow-hidden [overflow-wrap:anywhere]">
                    <LinkifiedText
                      text={subtitle}
                      linkClassName="text-primary font-medium [overflow-wrap:anywhere]"
                    />
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-pointer"
            onClick={() => handleQuantityChange(-1)}
            disabled={isPending || isTemp || item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[1.25rem] text-center text-xs tabular-nums font-medium">
            {item.quantity}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 cursor-pointer"
            onClick={() => handleQuantityChange(1)}
            disabled={isPending || isTemp}
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
          onClick={handleDelete}
          disabled={isPending || isTemp}
          aria-label="Delete item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {listId != null ? (
          <Link
            href={`/lists/${listId}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent cursor-pointer"
            aria-label="Open list"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      {expanded && !isTemp ? (
        <div className="border-t border-border/60 px-3 pb-3 pt-3 space-y-2 bg-muted/20">
          {showNoteEditor ? (
            <div className="space-y-2">
              <Label htmlFor={`list-item-note-${item.id}`} className="text-xs">
                Edit your note
              </Label>
              <textarea
                id={`list-item-note-${item.id}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                disabled={notePending}
                placeholder="Optional detail for this item..."
                className={cn(
                  "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background whitespace-pre-wrap",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={handleSaveNote} disabled={notePending}>
                  {notePending ? "Saving…" : "Save note"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelNoteEdit}
                  disabled={notePending}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Saving replaces your previous note on this item. Others do not see your note. Links starting
                with http:// or www. open in a new tab from the preview when not editing.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {draft.trim().length > 0 ? (
                <p className="text-[11px] text-muted-foreground">Tap to edit.</p>
              ) : null}
              <div
                tabIndex={0}
                className={cn(
                  "w-full max-h-[min(12.5rem,38vh)] min-h-[2.75rem] overflow-y-auto overscroll-contain rounded-lg border border-border/50 bg-background/80",
                  "p-2.5 text-sm text-left text-foreground whitespace-pre-wrap break-words",
                  "cursor-pointer transition-colors hover:bg-muted/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
                onClick={() => setShowNoteEditor(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowNoteEditor(true);
                  }
                }}
              >
                {draft.trim().length > 0 ? (
                  <LinkifiedText text={draft} />
                ) : (
                  <span className="text-muted-foreground">Tap to add a note…</span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}
