"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "@/lib/actions/password.actions";
import { toast } from "sonner";

interface ChangePasswordFormProps {
  mustChangePassword?: boolean;
  /** When set, redirect here after a successful change (forced flow). */
  redirectTo?: string;
  /** When false, show a compact inline form for Settings. */
  showTitle?: boolean;
}

export function ChangePasswordForm({
  mustChangePassword = false,
  redirectTo,
  showTitle = true,
}: ChangePasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await changePasswordAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Password updated.");
    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {showTitle ? (
        <p className="text-xs text-muted-foreground">
          Passwords must be at least 10 characters.
        </p>
      ) : null}
      {!mustChangePassword && (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" required />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={10} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={10} />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
