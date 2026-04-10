"use client";

import type { ComponentProps } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { SharedListItemRow } from "./shared-list-item-row";

type SortableSharedListItemRowProps = Omit<
  ComponentProps<typeof SharedListItemRow>,
  "leadingControl" | "rowRef" | "rowStyle" | "rowExtraClassName"
>;

export function SortableSharedListItemRow(props: SortableSharedListItemRowProps) {
  const { item } = props;
  const disabled = item.id < 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SharedListItemRow
      {...props}
      rowRef={setNodeRef}
      rowStyle={style}
      rowExtraClassName={isDragging ? "opacity-80 z-10 shadow-md" : undefined}
      leadingControl={
        disabled ? null : (
          <div
            className="flex shrink-0 cursor-grab touch-none rounded p-1 hover:bg-muted active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Drag to reorder ${item.label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
        )
      }
    />
  );
}
