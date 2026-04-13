"use client";

import { useEffect, useMemo, useState } from "react";
import type { SetupWizardBootstrapData } from "@/components/setup-wizard/setup-wizard-types";
import { SetupWizardDialog } from "@/components/setup-wizard/setup-wizard-dialog";

const OPEN_EVENT = "homefinance:open-setup-wizard";
type SetupWizardOpenReason = "auto" | "manual";

export function openSetupWizard() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function SetupWizardHost(props: { bootstrap: SetupWizardBootstrapData; autoPrompt: boolean }) {
  const { bootstrap, autoPrompt } = props;
  const [open, setOpen] = useState(false);
  const [openReason, setOpenReason] = useState<SetupWizardOpenReason>("manual");

  const shouldAutoOpen = useMemo(() => {
    if (!autoPrompt) return false;
    switch (bootstrap.setup.status) {
      case "not_started":
      case "in_progress":
        return true;
      case "dismissed":
      case "completed":
        return false;
      default: {
        const _exhaustive: never = bootstrap.setup.status;
        return _exhaustive;
      }
    }
  }, [autoPrompt, bootstrap.setup.status]);

  useEffect(() => {
    if (!shouldAutoOpen) return;
    const t = setTimeout(() => {
      setOpenReason("auto");
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [shouldAutoOpen]);

  useEffect(() => {
    const handler = () => {
      setOpenReason("manual");
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_EVENT, handler as EventListener);
  }, []);

  return (
    <SetupWizardDialog
      open={open}
      onOpenChange={setOpen}
      bootstrap={bootstrap}
      persistDismissal={autoPrompt && openReason === "auto"}
    />
  );
}

