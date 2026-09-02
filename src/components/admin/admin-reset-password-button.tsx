"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { adminResetUserPassword } from "@/lib/actions/admin/admin-user.actions";
import { toast } from "sonner";

interface AdminResetPasswordButtonProps {
  userId: number;
  userName: string;
}

export function AdminResetPasswordButton({ userId, userName }: AdminResetPasswordButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("userId", String(userId));
      const result = await adminResetUserPassword(formData);
      setConfirmOpen(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTempPassword(result.tempPassword);
      setResultOpen(true);
    });
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy. Select and copy the password manually.");
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
        Reset password
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Reset password for ${userName}?`}
        description="A temporary password will be generated. The user must change it on next sign-in."
        confirmLabel="Reset password"
        destructive
        isPending={isPending}
        onConfirm={onConfirm}
      />
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogHeader>Temporary password</DialogHeader>
        <p className="text-sm text-muted-foreground">
          Share this with the user once. It will not be shown again. They will be required to set a
          new password when they sign in.
        </p>
        <p className="mt-3 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm break-all">
          {tempPassword}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setResultOpen(false)}>
            Close
          </Button>
          <Button type="button" onClick={copyPassword}>
            Copy password
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
