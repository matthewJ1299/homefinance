import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/lib/auth";

export default async function PendingApprovalPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const status = session.user.householdApprovalStatus ?? "active";
  if (status === "active") {
    redirect("/dashboard");
  }

  const rejected = status === "rejected";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{rejected ? "Registration not approved" : "Waiting for approval"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {rejected ? (
          <p>
            Your household registration was not approved. Contact the administrator if you believe
            this is a mistake.
          </p>
        ) : (
          <p>
            Your household has been created and is waiting for an administrator to approve it.
            Sign out and try again once approval is granted.
          </p>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
