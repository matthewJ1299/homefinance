import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const mustChangePassword = session.user.mustChangePassword === true;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{mustChangePassword ? "Set a new password" : "Change password"}</CardTitle>
      </CardHeader>
      <CardContent>
        {mustChangePassword ? (
          <p className="text-sm text-muted-foreground mb-4">
            Your account requires a new password before you can continue.
          </p>
        ) : null}
        <ChangePasswordForm
          mustChangePassword={mustChangePassword}
          redirectTo={mustChangePassword ? "/dashboard" : undefined}
        />
      </CardContent>
    </Card>
  );
}
