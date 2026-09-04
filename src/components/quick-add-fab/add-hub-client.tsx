"use client";

import { soleOtherMemberName } from "@/lib/types/household-member";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ChevronRight, ClipboardList, Receipt, Zap } from "lucide-react";
import type { QuickAddFabProps } from "@/components/quick-add-fab/quick-add-fab";
import { QuickAddForm } from "@/components/expenses/quick-add-form";
import { EventFormDialog, buildCalendarEventApiBody } from "@/components/calendar/event-form-dialog";
import { AddListItemDialog } from "@/components/shared-lists/add-list-item-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ModalType = "expense" | "list-item" | "calendar" | null;
type QuickKind = "task" | "event" | "expense";

export function AddHubClient(props: QuickAddFabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalType>(null);
  const [quickText, setQuickText] = useState("");
  const [quickKind, setQuickKind] = useState<QuickKind>("task");
  const [listItemSeed, setListItemSeed] = useState("");
  const [expenseQuickSeed, setExpenseQuickSeed] = useState<string | null>(null);
  const [expenseFormKey, setExpenseFormKey] = useState(0);

  const openModal = (type: ModalType) => setModal(type);

  const openExpenseModal = (seedLine: string | null) => {
    setExpenseQuickSeed(seedLine?.trim() ? seedLine.trim() : null);
    setExpenseFormKey((k) => k + 1);
    openModal("expense");
  };

  const runQuickAdd = () => {
    if (quickKind === "expense") {
      openExpenseModal(quickText);
      return;
    }
    if (quickKind === "event") {
      openModal("calendar");
      return;
    }
    setListItemSeed(quickText.trim());
    openModal("list-item");
  };

  const hubCards: Array<{
    title: string;
    description: string;
    icon: typeof ClipboardList;
    iconClass: string;
    onClick: () => void;
  }> = [
    {
      title: "New task",
      description: "Add a to-do item to your lists",
      icon: ClipboardList,
      iconClass: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      onClick: () => {
        setListItemSeed("");
        openModal("list-item");
      },
    },
    {
      title: "New event",
      description: "Schedule something on your calendar",
      icon: Calendar,
      iconClass: "bg-sky-500/20 text-sky-600 dark:text-sky-400",
      onClick: () => openModal("calendar"),
    },
    {
      title: "New expense",
      description: "Log a purchase or bill",
      icon: Receipt,
      iconClass: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
      onClick: () => openExpenseModal(null),
    },
  ];

  return (
    <div className="space-y-6 pb-24">
      <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2">
        <Link
          href="/dashboard"
          aria-label="Back to home"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-input bg-secondary text-secondary-foreground justify-self-start cursor-pointer hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-center">Create new</h1>
        <span aria-hidden className="justify-self-end w-10" />
      </header>

      <div className="space-y-3">
        {hubCards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={card.onClick}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-4 text-left shadow-sm",
              "cursor-pointer transition-colors hover:bg-accent/25 active:scale-[0.99]"
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                card.iconClass
              )}
            >
              <card.icon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground">{card.title}</div>
              <div className="text-sm text-muted-foreground">{card.description}</div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-primary" aria-hidden />
          Quick add
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-sm space-y-3">
          <div className="space-y-2">
            <Label htmlFor="hub-quick-text">What do you need to add?</Label>
            <Input
              id="hub-quick-text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="e.g. Team standup, groceries"
              className="cursor-text"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="hub-quick-kind">Type</Label>
              <select
                id="hub-quick-kind"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
                value={quickKind}
                onChange={(e) => setQuickKind(e.target.value as QuickKind)}
              >
                <option value="task">Task</option>
                <option value="event">Event</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <Button
              type="button"
              className="w-full sm:w-auto shrink-0 cursor-pointer"
              onClick={runQuickAdd}
            >
              + Add
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={modal === "expense"}
        onOpenChange={(open) => {
          if (!open) {
            setModal(null);
            setExpenseQuickSeed(null);
          }
        }}
      >
        <DialogHeader>Add expense</DialogHeader>
        <QuickAddForm
          key={expenseFormKey}
          categories={props.categories}
          userId={props.userId}
          otherUserName={soleOtherMemberName(props.members ?? [])}
          splitGroups={props.splitGroups}
          quickSeed={expenseQuickSeed}
          onAfterSave={() => {
            setModal(null);
            setExpenseQuickSeed(null);
            setQuickText("");
            router.push("/dashboard");
          }}
        />
      </Dialog>

      {modal === "list-item" && (
        <AddListItemDialog
          lists={props.lists}
          open={modal === "list-item"}
          initialLabel={listItemSeed}
          onOpenChange={(open) => {
            if (!open) {
              setModal(null);
              setListItemSeed("");
            }
          }}
          onSuccess={({ listId }) => {
            setModal(null);
            setListItemSeed("");
            setQuickText("");
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
            setQuickText("");
            router.push("/calendar");
          }}
        />
      )}
    </div>
  );
}
