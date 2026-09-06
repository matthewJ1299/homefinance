"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  /** Announced as the sheet's name. */
  label: string;
}

/**
 * A bottom sheet.
 *
 * Separates from the page by surface and edge rather than by shadow: a shadow
 * does nothing on #0f1117, so `bg-sheet` plus the 1px `border-sheet-edge` top
 * is what reads as "lifted" in dark. Light resolves both to card and border.
 *
 * Portal content is absent until mounted, matching the Dialog primitive --
 * `typeof document` differs between the server render and the client's first
 * render, which is a permanent hydration mismatch otherwise.
 */
export function Sheet({ open, onOpenChange, children, className, label }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // `mounted` belongs in the deps: the portal is absent on the first render, so
  // a sheet whose parent mounts it already open (the settle sheet, rendered only
  // once a recipient is picked) ran this before the <dialog> existed and never
  // ran it again -- open state set, nothing on screen.
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
    const onCancel = (e: Event) => {
      e.preventDefault();
      onOpenChange(false);
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={ref}
      aria-label={label}
      onClick={(e) => {
        if (e.target === ref.current) onOpenChange(false);
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-lg rounded-t-2xl border-t border-sheet-edge bg-sheet p-0 text-foreground",
        "backdrop:bg-[var(--scrim)] sm:mx-auto sm:mb-0",
        className
      )}
    >
      <div className="flex max-h-[92dvh] flex-col overflow-hidden">
        <div className="pt-2 pb-1">
          <div className="mx-auto h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>
        {children}
      </div>
    </dialog>,
    document.body
  );
}
