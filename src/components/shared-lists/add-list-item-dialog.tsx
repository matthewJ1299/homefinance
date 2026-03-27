"use client";

import { useState, useTransition, useEffect } from "react";
import type {
  ListVisibility,
  SharedList,
} from "@/lib/repositories/interfaces/shared-list.repository";
import { createListItem } from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";

export interface AddListItemDialogProps {
  lists: SharedList[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save; `listId` is the list the item was added to. */
  onSuccess: (detail: { listId: number }) => void;
  /** Prefills the item label when the dialog opens (e.g. from Quick add). */
  initialLabel?: string;
}

export function AddListItemDialog({
  lists,
  open,
  onOpenChange,
  onSuccess,
  initialLabel = "",
}: AddListItemDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [listVisibility, setListVisibility] = useState<ListVisibility>("shared");
  const filteredLists = lists.filter((l) => l.visibility === listVisibility);
  const [listId, setListId] = useState<number | "">(filteredLists[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

  useEffect(() => {
    setListId(lists.find((l) => l.visibility === listVisibility)?.id ?? "");
  }, [listVisibility, lists]);

  useEffect(() => {
    if (open) {
      setLabel(initialLabel.trim());
    }
  }, [open, initialLabel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = listId === "" ? null : Number(listId);
    if (id == null) {
      setError("Select a list");
      return;
    }
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    setError("");
    startTransition(async () => {
      const result = await createListItem(id, { label: trimmed, quantity: qty });
      if (result.success) {
        setLabel("");
        setQuantity("1");
        setListId(filteredLists[0]?.id ?? "");
        onSuccess({ listId: id });
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>Add list item</DialogHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant={listVisibility === "shared" ? "default" : "outline"}
            onClick={() => setListVisibility("shared")}
          >
            Shared
          </Button>
          <Button
            type="button"
            size="sm"
            variant={listVisibility === "personal" ? "default" : "outline"}
            onClick={() => setListVisibility("personal")}
          >
            Personal
          </Button>
        </div>
        {filteredLists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No {listVisibility} lists yet. Create a list in Settings first.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="add-list-item-list">List</Label>
              <select
                id="add-list-item-list"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={listId}
                onChange={(e) =>
                  setListId(e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                {filteredLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-list-item-label">Item</Label>
              <Input
                id="add-list-item-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Milk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-list-item-qty">Quantity</Label>
              <Input
                id="add-list-item-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}
        <DialogFooter className="justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {filteredLists.length > 0 && (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add"}
            </Button>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  );
}
