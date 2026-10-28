"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { SharedListsManage } from "@/components/shared-lists/shared-lists-manage";
import { SharedListItemsManage } from "@/components/shared-lists/shared-list-items-manage";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import type { Note } from "@/lib/types/note";
import { loadSettingsListItemsAction } from "@/lib/actions/settings.actions";

interface SettingsListsSectionProps {
  lists: SharedList[];
}

export function SettingsListsSection({ lists }: SettingsListsSectionProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [itemsByListId, setItemsByListId] = useState<Record<number, SharedListItem[]>>({});
  const [notesByItemId, setNotesByItemId] = useState<Record<number, Note[]>>({});
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleToggle = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen || loaded) return;
    startTransition(async () => {
      const result = await loadSettingsListItemsAction();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setItemsByListId(result.data.itemsByListId);
      setNotesByItemId(result.data.notesByItemId);
      setLoaded(true);
      setError("");
    });
  };

  return (
    <details
      open={open}
      onToggle={(e) => handleToggle(e.currentTarget.open)}
      className="group rounded-lg border border-border bg-card"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span>Lists</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-3 space-y-4">
        <p className="text-sm text-muted-foreground">
          Create and delete shared or personal lists. Pick a list below to add or remove checklist rows
          without opening the Lists pages.
        </p>
        <SharedListsManage lists={lists} />
        {!loaded && open ? (
          <p className="text-sm text-muted-foreground">
            {isPending ? "Loading list items…" : "Opening lists…"}
          </p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loaded ? (
          <SharedListItemsManage
            lists={lists}
            itemsByListId={itemsByListId}
            notesByItemId={notesByItemId}
          />
        ) : null}
      </div>
    </details>
  );
}
