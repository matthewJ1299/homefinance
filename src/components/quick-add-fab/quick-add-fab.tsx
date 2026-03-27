"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Category, SplitGroup } from "@/lib/types";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import { QuickAddForm } from "@/components/expenses/quick-add-form";
import { EventFormDialog, buildCalendarEventApiBody } from "@/components/calendar/event-form-dialog";
import { AddListItemDialog } from "@/components/shared-lists/add-list-item-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface QuickAddFabProps {
  categories: Category[];
  userId: number;
  otherUserName?: string;
  splitGroups: SplitGroup[];
  lists: SharedList[];
}

type ModalType = "expense" | "list-item" | "calendar" | null;

export function QuickAddFab({
  categories,
  userId,
  otherUserName,
  splitGroups,
  lists,
}: QuickAddFabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <div
        ref={menuRef}
        className="fixed bottom-20 left-4 z-40 flex flex-col-reverse items-start gap-2 md:bottom-6 md:left-6"
      >
        {menuOpen && (
          <div
            className="flex flex-col rounded-lg border bg-background shadow-lg py-1 min-w-[160px]"
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
        )}
        <Button
          type="button"
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full shadow-lg text-xl",
            menuOpen && "rotate-45"
          )}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Quick add"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          +
        </Button>
      </div>

      <Dialog open={modal === "expense"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogHeader>Add expense</DialogHeader>
        <QuickAddForm
          categories={categories}
          userId={userId}
          otherUserName={otherUserName}
          splitGroups={splitGroups}
          onAfterSave={() => {
            setModal(null);
            router.push("/dashboard");
          }}
        />
      </Dialog>

      <AddListItemDialog
        lists={lists}
        open={modal === "list-item"}
        onOpenChange={(open) => !open && setModal(null)}
        onSuccess={({ listId }) => {
          setModal(null);
          router.push(`/lists/${listId}`);
        }}
      />

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
              body: JSON.stringify(buildCalendarEventApiBody(values)),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Failed to create event");
            }
            queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
            setModal(null);
            router.push("/calendar");
          }}
        />
      )}
    </>
  );
}
