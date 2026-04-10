"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { ListVisibility, SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import type { Note } from "@/lib/types/note";
import { cn } from "@/lib/utils";
import { SharedListItemRow } from "./shared-list-item-row";
import { usePropSyncedState } from "@/hooks/use-prop-synced-state";

const NO_NOTES: Note[] = [];

export function MyListsOverview({
  lists,
  itemsByListId,
  notesByItemId,
  scope,
}: {
  lists: SharedList[];
  itemsByListId: Record<number, SharedListItem[]>;
  notesByItemId: Record<number, Note[]>;
  scope: ListVisibility;
}) {
  const [filterId, setFilterId] = useState<number | "all">("all");
  const [itemsState, setItemsState] = usePropSyncedState(itemsByListId);
  const [notesState] = usePropSyncedState(notesByItemId);

  const sortedLists = useMemo(
    () => [...lists].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [lists]
  );

  const visibleLists = useMemo(() => {
    if (filterId === "all") return sortedLists;
    return sortedLists.filter((l) => l.id === filterId);
  }, [filterId, sortedLists]);

  const optimisticUpsertItem = useCallback(
    (next: SharedListItem) => {
      const snapshot = itemsState;
      setItemsState((prev) => {
        const listItems = prev[next.listId] ?? [];
        const idx = listItems.findIndex((i) => i.id === next.id);
        const nextList =
          idx >= 0
            ? listItems.map((i) => (i.id === next.id ? next : i))
            : [next, ...listItems];
        return { ...prev, [next.listId]: nextList };
      });
      return () => setItemsState(snapshot);
    },
    [itemsState, setItemsState]
  );

  const optimisticRemoveItem = useCallback(
    (item: SharedListItem) => {
      const snapshot = itemsState;
      setItemsState((prev) => {
        const listItems = prev[item.listId] ?? [];
        return { ...prev, [item.listId]: listItems.filter((i) => i.id !== item.id) };
      });
      return () => setItemsState(snapshot);
    },
    [itemsState, setItemsState]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterId("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            filterId === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
        >
          All
        </button>
        {sortedLists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setFilterId(list.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer max-w-[160px] truncate",
              filterId === list.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            )}
            title={list.name}
          >
            {list.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleLists.map((list) => {
          const items = itemsState[list.id] ?? [];
          const done = items.filter((i) => i.completed).length;
          const total = items.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <section
              key={list.id}
              className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight truncate">{list.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {done}/{total} done
                  </p>
                </div>
                <Link
                  href={`/lists/${list.id}`}
                  className="text-xs font-medium text-primary shrink-0 cursor-pointer hover:underline"
                >
                  Open
                </Link>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No items yet.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <SharedListItemRow
                      key={item.id}
                      item={item}
                      notes={notesState[item.id] ?? NO_NOTES}
                      listId={list.id}
                      dateLabel={format(new Date(item.createdAt), "MMM d")}
                      onOptimisticUpsertItem={optimisticUpsertItem}
                      onOptimisticRemoveItem={optimisticRemoveItem}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Scope: {scope === "shared" ? "Shared lists" : "Personal lists"}. Switch above or in{" "}
        <Link href="/settings" className="text-primary underline hover:no-underline cursor-pointer">
          Settings
        </Link>{" "}
        to manage lists.
      </p>
    </div>
  );
}
