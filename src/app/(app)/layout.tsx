import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });
  return <AppShell>{children}</AppShell>;
}
