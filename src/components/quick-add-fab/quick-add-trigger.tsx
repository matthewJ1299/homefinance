"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Category, SplitGroup } from "@/lib/types";
import type { SharedList } from "@/lib/repositories/interfaces/shared-list.repository";
import { QuickAddForm } from "@/components/expenses/quick-add-form";
import { EventFormDialog, buildCalendarEventApiBody } from "@/components/calendar/event-form-dialog";
import { AddListItemDialog } from "@/components/shared-lists/add-list-item-dialog";
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

interface QuickAddTriggerProps extends QuickAddFabProps {
  children: (props: {
    menuOpen: boolean;
    onClick: () => void;
    triggerRef: React.RefObject<HTMLButtonElement | null>;
  }) => React.ReactNode;
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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
          "flex flex-col rounded-lg border bg-background shadow-lg py-1 min-w-[180px] z-[60]",
          menuAbove && "fixed bottom-[4.5rem] left-1/2 -translate-x-1/2"
        )}
        role="menu"
      >
        <button
          type="button"
          className="px-4 py-2.5 text-left text-sm hover:bg-accent rounded-none first:rounded-t-lg cursor-pointer"
          onClick={() => openModal("expense")}
          role="menuitem"
        >
          Expense
        </button>
        <button
          type="button"
          className="px-4 py-2.5 text-left text-sm hover:bg-accent rounded-none cursor-pointer"
          onClick={() => openModal("list-item")}
          role="menuitem"
        >
          List item
        </button>
        <button
          type="button"
          className="px-4 py-2.5 text-left text-sm hover:bg-accent rounded-none last:rounded-b-lg cursor-pointer"
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
        triggerRef,
      })}
      {mounted && menuContent !== null && createPortal(menuContent, document.body)}

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

      {modal === "list-item" && (
        <AddListItemDialog
          lists={lists}
          open={modal === "list-item"}
          onOpenChange={(open) => !open && setModal(null)}
          onSuccess={({ listId }) => {
            setModal(null);
            router.push(`/lists/${listId}`);
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
