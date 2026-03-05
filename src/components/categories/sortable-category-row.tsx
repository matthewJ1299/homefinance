"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CategoryWithActive } from "@/lib/types";

interface SortableCategoryRowProps {
  category: CategoryWithActive;
  children: React.ReactNode;
}

export function SortableCategoryRow({ category, children }: SortableCategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-wrap items-center gap-2 rounded-lg border p-3 ${
        !category.isActive ? "opacity-60 bg-muted/50" : ""
      } ${isDragging ? "opacity-80 z-10 shadow-md" : ""}`}
    >
      <div
        className="flex shrink-0 cursor-grab active:cursor-grabbing touch-none rounded p-1 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Drag to reorder ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      {children}
    </li>
  );
}
