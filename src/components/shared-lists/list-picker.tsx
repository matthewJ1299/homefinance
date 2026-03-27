"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteList } from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import { toast } from "sonner";

interface ListPickerProps {
  lists: SharedList[];
  title?: string;
  onOptimisticRemoveList?: (list: SharedList) => () => void;
}

export function ListPicker({ lists, title, onOptimisticRemoveList }: ListPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "error" | null>(null);
  const [errorText, setErrorText] = useState("");

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete list "${name}" and all its items? This cannot be undone.`))
      return;
    setErrorText("");
    startTransition(async () => {
      const list = lists.find((l) => l.id === id) ?? null;
      const rollback = list ? onOptimisticRemoveList?.(list) : undefined;
      const result = await deleteList(id);
      if (result.success) {
        toast.success("List deleted.");
        void router.refresh();
      } else {
        rollback?.();
        setErrorText(result.error);
        setMessage("error");
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm text-muted-foreground mb-3">
        {title ?? "Your lists"}
      </h3>
      {lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No lists yet. Add one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {lists.map((list) => (
            <li
              key={list.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border p-3"
            >
              <Link
                href={`/lists/${list.id}`}
                className="font-medium hover:underline flex-1 min-w-0"
              >
                {list.name}
              </Link>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(list.id, list.name)}
                disabled={isPending}
              >
                Delete list
              </Button>
            </li>
          ))}
        </ul>
      )}
      {message === "error" && errorText && (
        <p className="text-sm text-destructive">{errorText}</p>
      )}
    </div>
  );
}
