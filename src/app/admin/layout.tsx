import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { FeedbackService } from "@/lib/services/feedback.service";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.mustChangePassword === true) {
    redirect("/change-password");
  }

  setRequestContextFromSession(session);
  try {
    requireSuperAdmin();
  } catch {
    redirect("/dashboard");
  }

  // Read here rather than on the feedback page, so the badge is on screen from
  // whichever admin page they happen to be looking at.
  const unreadFeedback = await new FeedbackService().unreadCountFor(Number(session.user.id));

  return <AdminShell unreadFeedback={unreadFeedback}>{children}</AdminShell>;
}

