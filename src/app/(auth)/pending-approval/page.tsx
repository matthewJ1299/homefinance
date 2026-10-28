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
        <CardTitle>
          {rejected ? "Your house wasn't approved" : "Someone will approve your house shortly"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        {rejected ? (
          <p>
            An administrator turned down this house. If that looks like a mistake, get in touch
            with them — nothing you entered has been deleted.
          </p>
        ) : (
          <>
            {/* Copy-only for beta. The designed waiting experience stays on the
                shelf; what a person needs here is what is happening and roughly
                how long, not a progress animation for a manual step. */}
            <p>
              Your house is made and an administrator is checking it over. This is a person, not an
              automatic step, so it usually happens within a day.
            </p>
            <p>
              Nothing is lost while you wait. Sign in again once you hear back and everything will
              be where you left it.
            </p>
          </>
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
