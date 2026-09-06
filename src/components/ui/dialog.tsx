"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Portal content must be absent on both the server render and the client's first
  // (pre-hydration) render — `typeof document` differs between them and caused a
  // permanent hydration mismatch on every page that renders a Dialog. Flip to
  // rendering the portal only after mount, once hydration has already settled.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // `mounted` belongs in the deps: the portal is absent on the first render, so
  // a dialog whose parent mounts it already open would run this before the
  // <dialog> existed and never run it again.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, mounted]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = () => onOpenChange(false);
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onOpenChange]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) onOpenChange(false);
  };

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className={cn(
        "fixed inset-0 z-50 max-h-[100dvh] w-full max-w-lg mx-auto rounded-lg border bg-background p-4 shadow-lg backdrop:bg-black/50",
        className
      )}
    >
      {children}
    </dialog>,
    document.body
  );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4 text-sm font-medium", className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)}>{children}</div>;
}
