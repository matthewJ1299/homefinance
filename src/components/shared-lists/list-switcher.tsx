"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import { cn } from "@/lib/utils";

interface ListSwitcherProps {
  lists: SharedList[];
  currentList: SharedList;
}

export function ListSwitcher({ lists, currentList }: ListSwitcherProps) {
  const pathname = usePathname();
  if (lists.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">List:</span>
      {lists.map((list) => (
        <Link
          key={list.id}
          href={`/lists/${list.id}`}
          className={cn(
            "text-sm font-medium rounded-md px-2 py-1 hover:bg-accent",
            pathname === `/lists/${list.id}`
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {list.name}
        </Link>
      ))}
    </div>
  );
}
