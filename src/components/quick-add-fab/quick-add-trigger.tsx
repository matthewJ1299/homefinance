"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Category, SplitGroup } from "@/lib/types";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import { QuickAddForm } from "@/components/expenses/quick-add-form";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { createListItem } from "@/lib/actions/shared-list.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface QuickAddFabProps {
  categories: Category[];
  userId: number;
  otherUserName?: string;
  splitGroups: SplitGroup[];
  lists: SharedList[];
}

type ModalType = "expense" | "list-item" | "calendar" | null;

interface QuickAddTriggerProps extends QuickAddFabProps {
  /** Renders the trigger button (e.g. center nav item). Receives open state and onClick. */
  children: (props: { menuOpen: boolean; onClick: () => void }) => React.ReactNode;
  /** When true, menu is positioned above the trigger (e.g. above bottom nav). */
  menuAbove?: boolean;
}

export function QuickAddTrigger({
  categories,
  userId,
  otherUserName,
  splitGroups,
  lists,
  children,
  menuAbove = true,
}: QuickAddTriggerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const openModal = (type: ModalType) => {
    setMenuOpen(false);
    setModal(type);
  };

  const menuContent =
    menuOpen && mounted ? (
      <div
        ref={menuRef}
        className={cn(
          "flex flex-col rounded-lg border bg-background shadow-lg py-1 min-w-[160px] z-[60]",
          menuAbove && "fixed bottom-14 left-1/2 -translate-x-1/2"
        )}
        role="menu"
      >
        <button
          type="button"
          className="px-4 py-2.5 text-left text-sm hover:bg-accent rounded-none first:rounded-t-lg"
          onClick={() => openModal("expense")}
          role="menuitem"
        >
          Expense
        </button>
        <button
          type="button"
          className="px-4 py-2.5 text-left text-sm hover:bg-accent rounded-none"
          onClick={() => openModal("list-item")}
          role="menuitem"
        >
          List item
        </button>
        <button
          type="button"
          className="px-4 py-2.5 text-left text-sm hover:bg-accent rounded-none last:rounded-b-lg"
          onClick={() => openModal("calendar")}
          role="menuitem"
        >
          Calendar event
        </button>
      </div>
    ) : null;

  return (
    <>
      {children({
        menuOpen,
        onClick: () => setMenuOpen((o) => !o),
      })}
      {mounted && menuContent !== null && createPortal(menuContent, document.body)}

      <Dialog open={modal === "expense"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogHeader>Add expense</DialogHeader>
        <QuickAddForm
          categories={categories}
          userId={userId}
          otherUserName={otherUserName}
          splitGroups={splitGroups}
          onAfterSave={() => setModal(null)}
        />
      </Dialog>

      {modal === "list-item" && (
        <AddListItemDialog
          lists={lists}
          open={modal === "list-item"}
          onOpenChange={(open) => !open && setModal(null)}
          onSuccess={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}

      {modal === "calendar" && (
        <EventFormDialog
          open={modal === "calendar"}
          onOpenChange={(open) => !open && setModal(null)}
          defaultDate={new Date().toISOString().slice(0, 10)}
          defaultTime={null}
          onSubmit={async (values) => {
            const res = await fetch("/api/calendar/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: values.name,
                location: values.location ?? null,
                date: values.date,
                time: values.time ?? null,
                notes: values.notes ?? null,
                recurrenceType: values.recurrenceType,
                recurrenceDayOfMonth: values.recurrenceDayOfMonth ?? null,
              }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Failed to create event");
            }
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

interface AddListItemDialogProps {
  lists: SharedList[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function AddListItemDialog({
  lists,
  open,
  onOpenChange,
  onSuccess,
}: AddListItemDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [listId, setListId] = useState<number | "">(lists[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");

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
        setListId(lists[0]?.id ?? "");
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DialogHeader>Add list item</DialogHeader>
        {lists.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No lists yet. Create a list on the Lists page first.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="fab-list">List</Label>
              <select
                id="fab-list"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={listId}
                onChange={(e) =>
                  setListId(e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fab-item-label">Item</Label>
              <Input
                id="fab-item-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Milk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fab-item-qty">Quantity</Label>
              <Input
                id="fab-item-qty"
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
          {lists.length > 0 && (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add"}
            </Button>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  );
}
