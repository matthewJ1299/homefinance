"use client";

import { useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { reorderListItems } from "@/lib/actions/shared-list.actions";
import { SortableSharedListItemRow } from "./sortable-shared-list-item-row";
import type { SharedListItem } from "@/lib/repositories/interfaces/shared-list-item.repository";
import type { Note } from "@/lib/types/note";
import { toast } from "sonner";

const NO_NOTES: Note[] = [];

interface SharedListSortableItemListProps {
  listId: number;
  items: SharedListItem[];
  setItems: Dispatch<SetStateAction<SharedListItem[]>>;
  notesByItemId: Record<number, Note[]>;
  onOptimisticUpsertItem?: (next: SharedListItem) => () => void;
  onOptimisticRemoveItem?: (item: SharedListItem) => () => void;
  /** When set, each row shows a chevron link to this list detail page (e.g. Settings manage view). */
  listDetailLinkId?: number;
}

export function SharedListSortableItemList({
  listId,
  items,
  setItems,
  notesByItemId,
  onOptimisticUpsertItem,
  onOptimisticRemoveItem,
  listDetailLinkId,
}: SharedListSortableItemListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const incomplete = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: DragEndEvent, completedSection: boolean) => {
    const { active, over } = event;
    if (over == null || active.id === over.id) return;
    const section = items.filter((i) => i.completed === completedSection);
    const ids = section.map((i) => i.id);
    const oldIndex = ids.indexOf(active.id as number);
    const newIndex = ids.indexOf(over.id as number);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrderIds = arrayMove(ids, oldIndex, newIndex);
    const snapshot = items;
    setItems((prev) => {
      const inc = prev.filter((i) => !i.completed);
      const comp = prev.filter((i) => i.completed);
      if (completedSection) {
        return [...inc, ...arrayMove(comp, oldIndex, newIndex)];
      }
      return [...arrayMove(inc, oldIndex, newIndex), ...comp];
    });
    startTransition(async () => {
      const result = await reorderListItems(listId, newOrderIds, completedSection);
      if (result.success) {
        toast.success("Items reordered.");
        void router.refresh();
      } else {
        setItems(snapshot);
        toast.error(result.error);
      }
    });
  };

  const rowListId = listDetailLinkId;

  return (
    <div className="space-y-4">
      {incomplete.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => handleSectionDragEnd(e, false)}
        >
          <SortableContext
            items={incomplete.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {incomplete.map((item) => (
                <SortableSharedListItemRow
                  key={item.id}
                  item={item}
                  notes={notesByItemId[item.id] ?? NO_NOTES}
                  listId={rowListId}
                  onOptimisticUpsertItem={onOptimisticUpsertItem}
                  onOptimisticRemoveItem={onOptimisticRemoveItem}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}

      {completed.length > 0 && incomplete.length > 0 ? (
        <p className="text-xs font-medium text-muted-foreground pt-1">Completed</p>
      ) : null}

      {completed.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => handleSectionDragEnd(e, true)}
        >
          <SortableContext
            items={completed.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {completed.map((item) => (
                <SortableSharedListItemRow
                  key={item.id}
                  item={item}
                  notes={notesByItemId[item.id] ?? NO_NOTES}
                  listId={rowListId}
                  onOptimisticUpsertItem={onOptimisticUpsertItem}
                  onOptimisticRemoveItem={onOptimisticRemoveItem}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : null}
    </div>
  );
}
