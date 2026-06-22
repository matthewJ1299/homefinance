"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>{title}</DialogHeader>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? "Working..." : confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
