import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { requireSuperAdmin } from "@/lib/db/request-context";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

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

  return <AdminShell>{children}</AdminShell>;
}

